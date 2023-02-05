import TransportNodeHid from "@ledgerhq/hw-transport-node-hid-noevents";
import { Config } from "../Config";
import ora from "ora";
import { backoff, delay } from "@openland/patterns";
import { TonTransport, TonPayloadFormat } from 'ton-ledger';
import { prompt } from 'enquirer';
import { WalletV4Contract, WalletV4Source } from "ton-contracts";
import { Address, Cell, CellMessage, CommonMessageInfo, ExternalMessage, fromNano, SendMode, StateInit } from "ton";
import { askAddress } from "./utils/askAddress";
import { askAmount } from "./utils/askAmount";
import { askText } from "./utils/askText";
import { askBoC } from "./utils/askBoC";

async function askForKey(config: Config) {
    let network = config.testnet ? 2 : 0;
    let chain = 0;
    let account = 0;
    let resChain = await prompt<{ command: '-1' | '0' }>([{
        type: 'select',
        name: 'command',
        message: 'Chain',
        initial: 0,
        choices: [
            { message: 'Workchain', name: '0' },
            { message: 'Masterchain', name: '-1' }
        ]
    }]);
    if (resChain.command === '-1') {
        chain = 0xff;
    }
    let resAccount = await prompt<{ command: '0' | '1' | '2' | '3' | '4' | '5' }>([{
        type: 'select',
        name: 'command',
        message: 'Account',
        initial: 0,
        choices: [
            { message: 'Account #0', name: '0' },
            { message: 'Account #1', name: '1' },
            { message: 'Account #2', name: '2' },
            { message: 'Account #3', name: '3' },
            { message: 'Account #4', name: '4' },
            { message: 'Account #5', name: '5' }
        ]
    }]);
    account = parseInt(resAccount.command, 10);

    return {
        network,
        chain,
        account
    }
}

async function verifyAddress(transport: TonTransport, config: Config) {
    let { network, chain, account } = await askForKey(config);

    // Loading address
    let loader = ora('Loading address').start();
    let d = await transport.getAddress([44, 607, network, chain, account, 0], { testOnly: network !== 0, chain });
    loader.succeed('Verify ' + d.address);

    // Validation
    let validated = await transport.validateAddress([44, 607, network, chain, account, 0], { testOnly: network !== 0, chain });
    if (validated.address !== d.address) {
        console.warn('Address missmatch');
    }
}

async function transfer(transport: TonTransport, config: Config) {

    // Prepare
    let { network, chain, account } = await askForKey(config);
    let target = await askAddress({ message: 'Destination' });
    let amount = await askAmount();

    // Content
    let payload: TonPayloadFormat | undefined = undefined;
    let kind = (await prompt<{ kind: 'none' | 'comment' | 'boc' }>([{
        type: 'select',
        name: 'kind',
        message: 'Payload type',
        initial: 0,
        choices: [{
            message: 'None',
            name: 'none'
        }, {
            message: 'Comment',
            name: 'comment'
        }, {
            message: 'BoC (unsafe)',
            name: 'boc'
        }]
    }])).kind;
    if (kind === 'comment') {
        let comment = await askText({ message: 'Comment' });
        payload = { type: 'comment', text: comment };
    } else if (kind === 'boc') {
        let boc = await askBoC({ message: 'BoC in base64' });
        payload = { type: 'unsafe', message: new CellMessage(boc) }
    }

    // Prepare wallet
    let loader = ora('Loading wallet info...').start();
    let d = await transport.getAddress([44, 607, network, chain, account, 0], { testOnly: network !== 0, chain });
    loader.text = 'Loading wallet info...';
    let source = WalletV4Source.create({ workchain: chain === 0xff ? -1 : 0, publicKey: d.publicKey });
    let contract = new WalletV4Contract(Address.parse(d.address), source);
    let seqno = await backoff(() => contract.getSeqNo(config.client));
    let balance = await backoff(() => config.client.getBalance(contract.address));
    loader.succeed('Balance is ' + fromNano(balance));

    // Prepare transaction
    loader.start('Preparing transfer');
    let bounce = await backoff(() => config.client.isContractDeployed(target));
    loader.stop();
    if (!bounce) {
        let conf = await prompt<{ confirm: string }>([{
            type: 'confirm',
            name: 'confirm',
            message: 'Recepient account is not activated. Do you want to continue?',
            initial: false
        }]);
        if (!conf.confirm) {
            return;
        }
    }

    // Transfer
    loader.start('Signing');
    let signed: Cell;
    try {
        signed = await transport.signTransaction([44, 607, network, chain, account, 0], {
            to: target,
            amount: amount,
            sendMode: SendMode.PAY_GAS_SEPARATLY | SendMode.IGNORE_ERRORS,
            seqno,
            timeout: Math.floor((Date.now() / 1000) + 60),
            bounce: true,
            payload
        });
    } catch (e) {
        loader.fail('Signing failed')
        return;
    }

    // Sending
    loader.text = 'Sending...';
    let msg = new ExternalMessage({
        to: contract.address,
        body: new CommonMessageInfo({
            stateInit: seqno === 0 ? new StateInit({ code: source.initialCode, data: source.initialData }) : null,
            body: new CellMessage(signed)
        })
    });
    await backoff(() => config.client.sendMessage(msg));
    loader.succeed('Sent successfuly');
}

async function showBalance(transport: TonTransport, config: Config) {
    let { network, chain, account } = await askForKey(config);

    let loader = ora('Loading wallet info...').start();
    let d = await transport.getAddress([44, 607, network, chain, account, 0], { testOnly: network !== 0, chain });

    let source = WalletV4Source.create({ workchain: chain === 0xff ? -1 : 0, publicKey: d.publicKey });
    let contract = new WalletV4Contract(Address.parse(d.address), source);
    let balance = await backoff(() => config.client.getBalance(contract.address));

    loader.succeed('Balance is ' + fromNano(balance));
}

export async function openLedger(config: Config) {

    // Loading Ledger
    let loader = ora('Searching for Ledger').start();
    let ledger = await backoff(async () => {
        while (true) {

            // Searching for devices
            let devices = await TransportNodeHid.list();
            if (devices.length === 0) {
                await delay(1000);
                continue;
            }

            // Opening device
            return await TransportNodeHid.open(devices[0]);
        }
    }, { onError: (e) => console.warn(e) });
    loader.succeed();

    // Opening App
    const transport = new TonTransport(ledger);
    loader = ora('Awaiting TON app').start();
    await backoff(async () => {
        while (true) {
            if (await transport.isAppOpen()) {
                return;
            }
            await delay(1000);
        }
    });
    loader.succeed();

    // Menu
    while (true) {
        let res = await prompt<{ command: string }>([{
            type: 'select',
            name: 'command',
            message: 'Pick command',
            initial: 0,
            choices: [
                { message: 'Transfer', name: 'transfer' },
                { message: 'Verify address', name: 'verify' },
                { message: 'Show balance', name: 'balance' },
                { message: 'Exit', name: 'exit' }
            ]
        }]);

        switch (res.command) {
            case 'verify':
                await verifyAddress(transport, config);
                break;
            case 'transfer':
                await transfer(transport, config);
                break;
            case 'balance':
                await showBalance(transport, config);
                break;
            case 'exit':
                return;
        }
    }
}