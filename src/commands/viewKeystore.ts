import { Address, KeyStore, toNano, TonClient } from "ton";
import { askPassword } from "./utils/askPassword";
import { openKeystore } from "./utils/openKeystore";
import { prompt } from 'enquirer';
import { mnemonicToWalletKey, mnemonicValidate } from "ton-crypto";
import fs from 'fs';
import Table from 'cli-table';
import ora from "ora";
import { backoff } from '@openland/patterns';
import { Config } from "../Config";
import { openContacts } from "./utils/openContacts";

async function listKeys(store: KeyStore) {
    var table = new Table({
        head: ['Name', 'Address', 'Workchain', 'Kind'], colWidths: [16, 56, 16, 32]
    });
    for (let key of store.allKeys) {
        table.push([key.name, key.address.toFriendly(), key.address.workChain + '', key.kind])
    }
    console.log(table.toString());
    console.log('\n');
}

async function backupKeys(store: { store: KeyStore, name: string, password: string }) {
    let backup: { name: string, address: string, mnemonics: string[] }[] = [];
    const spinner = ora('Exporting keys...').start();
    for (let key of store.store.allKeys) {
        spinner.text = 'Exporting key ' + key.name;
        let mnemonics = (await store.store.getSecretKey(key.name, store.password)).toString().split(' ');
        if (!(await mnemonicValidate(mnemonics))) {
            throw Error('Mnemonics are invalid');
        }
        backup.push({ name: key.name, address: key.address.toFriendly(), mnemonics });
    }
    fs.writeFileSync(store.name + '.backup', JSON.stringify(backup));
    spinner.succeed();
}

async function listBalances(client: TonClient, store: KeyStore) {
    var table = new Table({
        head: ['Name', 'Address', 'Balance'], colWidths: [16, 56, 16]
    });
    const spinner = ora('Fetching balances...').start();
    for (let key of store.allKeys) {
        spinner.text = 'Fetching balance ' + key.name;
        let balance = await backoff(() => client.getBalance(key.address));
        table.push([key.name, key.address.toFriendly(), '' + balance]);
    }
    spinner.succeed();
    console.log(table.toString());
    console.log('\n');
}

async function newKeys(client: TonClient, store: { store: KeyStore, name: string, password: string }) {

    let res = await prompt<{ count: '1' | '10' | '100' | '300', prefix: string }>([{
        type: 'select',
        name: 'count',
        message: 'How many keys you want to create?',
        choices: [
            { message: '1', name: '1' },
            { message: '10', name: '10' },
            { message: '100', name: '100' },
            { message: '300', name: '300' }
        ],
    }, {
        type: 'input',
        name: 'prefix',
        message: 'Key name prefix',
        initial: 'wallet',
        validate: (src) => {
            if (src.length === 0) {
                return 'Prefix couldn\'t be empty';
            }
            return true;
        }
    }]);

    // Create keys
    const spinner = ora('Creating keys').start();
    let count = parseInt(res.count, 10);
    let index = 1;
    for (let i = 0; i < count; i++) {
        while (store.store.allKeys.find((v) => v.name === res.prefix + '_' + String(index).padStart(4, '0'))) {
            index++;
        }
        let keyname = res.prefix + '_' + String(index).padStart(4, '0');
        spinner.text = 'Creating key ' + keyname;
        let wallet = await client.createNewWallet({ workchain: 0 });
        await store.store.addKey({
            name: keyname,
            address: wallet.wallet.address,
            kind: 'org.ton.wallets.v3',
            config: '',
            comment: '',
            publicKey: wallet.key.publicKey
        }, store.password, Buffer.from(wallet.mnemonic.join(' ')));
    }
    fs.writeFileSync(store.name, await store.store.save());
    spinner.succeed('Keys created');
}

async function importKeys(client: TonClient, store: { store: KeyStore, name: string, password: string }) {

    let res = await prompt<{ name: string, mnemonics: string }>([{
        type: 'input',
        name: 'name',
        message: 'Key name',
        validate: (src) => {
            if (store.store.allKeys.find((v) => v.name === src)) {
                return 'Key already exist';
            }
            return true;
        }
    }, {
        type: 'password',
        name: 'mnemonics',
        message: 'Mnemonics',
        validate: (src) => mnemonicValidate(src.split(' '))
    }]);

    // Import key
    let key = await mnemonicToWalletKey(res.mnemonics.split(' '));
    let wallet = await client.openWalletDefaultFromSecretKey({ workchain: 0, secretKey: key.secretKey });
    await store.store.addKey({
        name: res.name,
        address: wallet.address,
        kind: 'org.ton.wallets.v3',
        config: '',
        comment: '',
        publicKey: key.publicKey
    }, store.password, Buffer.from(res.mnemonics));
    fs.writeFileSync(store.name, await store.store.save());
}

async function transfer(client: TonClient, store: { store: KeyStore, name: string, password: string }) {
    let contacts = await openContacts();
    if (contacts.length === 0) {
        console.warn('contacts.json is empty or does not exist');
    }
    let res = await prompt<{ send_from: string, send_to: string, amount: number }>([{
        type: 'select',
        name: 'send_from',
        message: 'Send from',
        initial: 0,
        choices: store.store.allKeys.map((v) => ({
            name: v.name,
            message: v.name,
            hint: v.address.toFriendly()
        }))
    }, {
        type: 'select',
        name: 'send_to',
        message: 'Send to',
        initial: 0,
        choices: contacts.map((v) => ({
            name: v.name,
            message: v.name,
            hint: v.address.toFriendly()
        }))
    }, {
        type: 'numeral',
        name: 'amount',
        message: 'Amount',
        initial: 0
    }]);

    // Read key
    let mnemonics = (await store.store.getSecretKey(res.send_from, store.password)).toString().split(' ');
    if (!(await mnemonicValidate(mnemonics))) {
        throw Error('Mnemonics are invalid');
    }
    let key = await mnemonicToWalletKey(mnemonics);
    let wallet = await client.openWalletDefaultFromSecretKey({ workchain: 0, secretKey: key.secretKey });
    let seqno = await backoff(() => wallet.getSeqNo());
    let target = contacts.find((v) => v.name === res.send_to)!.address;
    await backoff(() => wallet.transfer({
        to: target,
        value: toNano(res.amount),
        seqno: seqno,
        secretKey: key.secretKey,
        bounce: false
    }));
}

export async function viewKeystore(config: Config) {
    const store = await openKeystore();
    if (!store) {
        return;
    }
    const password = await askPassword(store.store);
    const client = new TonClient({ endpoint: config.test ? 'https://testnet.toncenter.com/api/v2/jsonRPC' : 'https://toncenter.com/api/v2/jsonRPC' });

    while (true) {
        let res = await prompt<{ command: string }>([{
            type: 'select',
            name: 'command',
            message: 'Pick command',
            initial: 0,
            choices: [
                { message: 'List keys', name: 'list-keys' },
                { message: 'Get balances', name: 'list-balances' },
                { message: 'Transfer', name: 'transfer' },
                { message: 'Create keys', name: 'create-keys' },
                { message: 'Import keys', name: 'import-keys' },
                { message: 'Backup keys', name: 'backup-keys' },
                { message: 'Exit', name: 'exit' }
            ]
        }]);

        if (res.command === 'import-keys') {
            await importKeys(client, { store: store.store, name: store.name, password });
        }
        if (res.command === 'list-keys') {
            await listKeys(store.store);
        }
        if (res.command === 'list-balances') {
            await listBalances(client, store.store);
        }
        if (res.command === 'create-keys') {
            await newKeys(client, { store: store.store, name: store.name, password });
        }
        if (res.command === 'transfer') {
            await transfer(client, { store: store.store, name: store.name, password });
        }
        if (res.command === 'backup-keys') {
            await backupKeys({ store: store.store, name: store.name, password });
        }
        if (res.command === 'exit') {
            return;
        }
    }
}