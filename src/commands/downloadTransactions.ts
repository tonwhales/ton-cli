import { backoff } from "@openland/patterns";
import { prompt } from "enquirer";
import { Cell, fromNano, parseTransaction, RawTransaction, TonTransaction } from "ton";
import { Config } from "../Config";
import { askAddress } from "./utils/askAddress";
import fs from 'fs';
import BN from "bn.js";

export async function downloadTransactions(config: Config) {
    console.log('Address to download transactions');
    let address = await askAddress({ message: 'Address to download transaction history' });
    let filename = (await prompt<{ name: string }>([{
        type: 'input',
        name: 'name',
        message: 'Dump file name',
        validate: (src) => {
            if (fs.existsSync(src + '.csv')) {
                return 'File ' + src + '.csv already exist!';
            }
            return true;
        }
    }])).name;

    let cursor: { hash: string, lt: string } | null = null;

    let txs: RawTransaction[] = [];
    while (true) {
        let res: TonTransaction[] = await backoff(() => config.client.getTransactions(address, { limit: 100, lt: cursor ? cursor.lt : undefined, hash: cursor ? cursor.hash : undefined }))
        for (let r of res) {
            txs.push(parseTransaction(address.workChain, Cell.fromBoc(Buffer.from(r.data, 'base64'))[0].beginParse()));
        }
        console.log('Downloaded ' + txs.length + ' transactions...');
        if (res.length > 0) {
            cursor = { lt: res[res.length - 1].id.lt, hash: res[res.length - 1].id.hash };
        } else {
            break;
        }
    }
    console.log('Download completed');

    // Records
    let records: { date: number, outgoing: boolean, address: string, amount: BN, fee: BN }[] = [];
    for (let tx of txs) {

        // If incoming message
        if (tx.inMessage && tx.inMessage.info.type === 'internal' && tx.inMessage.info.src) {
            records.push({
                date: tx.time,
                outgoing: false,
                address: tx.inMessage.info.src.toFriendly(),
                amount: tx.inMessage.info.value.coins,
                fee: tx.fees.coins
            });
        }

        // If outgoing messages
        if (tx.inMessage && tx.inMessage.info.type === 'external-in') {
            for (let msg of tx.outMessages) {
                if (msg.info.type === 'internal' && msg.info.dest) {
                    records.push({
                        date: tx.time,
                        outgoing: true,
                        address: msg.info.dest.toFriendly(),
                        amount: msg.info.value.coins,
                        fee: tx.fees.coins
                    });
                }
            }
        }
    }

    // Persist
    let data = '';
    for (let r of records) {
        data += new Date(r.date * 1000).toISOString() + ',' + (r.outgoing ? 'outgoing' : 'incoming') + ',' + r.address + ',' + fromNano(r.amount) + ',' + fromNano(r.fee);
        data = data + '\n';
    }
    fs.writeFileSync(filename + '.csv', data);
}