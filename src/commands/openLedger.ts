import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { Config } from "../Config";
import ora from "ora";
import { backoff, delay } from "@openland/patterns";
import { TonTransport } from 'ton-ledger';
import { prompt } from 'enquirer';

async function verifyAddress(transport: TonTransport) {
    let network = 0;
    let chain = 0;
    let account = 0;
    let res = await prompt<{ command: 'mainnet' | 'testnet' | 'sandbox' }>([{
        type: 'select',
        name: 'command',
        message: 'Network',
        initial: 0,
        choices: [
            { message: 'Mainnet', name: 'mainnet' },
            { message: 'Testnet', name: 'testnet' },
            { message: 'Sandbox', name: 'sandbox' }
        ]
    }]);
    if (res.command === 'testnet') {
        network = 1;
    } else if (res.command === 'sandbox') {
        network = 2;
    }
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
    });
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
                { message: 'Verify address', name: 'verify' },
                { message: 'Exit', name: 'exit' }
            ]
        }]);

        if (res.command === 'verify') {
            await verifyAddress(transport);
        }
        if (res.command === 'exit') {
            return;
        }
    }
}