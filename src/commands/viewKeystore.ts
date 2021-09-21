import { KeyStore, toNano, TonClient, validateWalletType } from "ton";
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
import { askConfirm } from "./utils/askConfirm";
import { askText } from "./utils/askText";
import { exportKey } from "./utils/exportKey";

async function listKeys(store: KeyStore) {
    var table = new Table({
        head: ['Name', 'WC', 'Address', 'Kind'], colWidths: [16, 4, 56, 24]
    });
    for (let key of store.allKeys) {
        table.push([key.name, key.address.workChain + '', key.address.toFriendly(), key.kind])
    }
    console.log(table.toString());
    console.log('\n');
}

async function backupKeys(store: { store: KeyStore, name: string }) {

    // Confirm
    if (!(await askConfirm('Backup stores keys in UNENCRYPTED FORM. Are you sure want to export unencrypted keys to disk?'))) {
        return;
    }

    // Ask for password
    const password = await askPassword(store.store);

    // Ask for name
    let srcName = store.name.substring(0, store.name.length - '.keystore'.length);
    let destName = await askText({ message: 'Backup name', initial: srcName });

    // Backup
    let backup: { name: string, address: string, comment: string, config: string, kind: string, mnemonics: string[] }[] = [];
    const spinner = ora('Exporting keys...').start();
    for (let key of store.store.allKeys) {
        spinner.text = 'Exporting key ' + key.name;
        let mnemonics = (await store.store.getSecret(key.name, password)).toString().split(' ');
        if (!(await mnemonicValidate(mnemonics))) {
            throw Error('Mnemonics are invalid');
        }
        backup.push({ name: key.name, comment: key.comment, config: key.config, kind: key.kind, address: key.address.toFriendly(), mnemonics });
    }
    fs.writeFileSync(destName + '.keystore.backup', JSON.stringify(backup));
    spinner.succeed();
}

async function listBalances(client: TonClient, store: KeyStore) {
    var table = new Table({
        head: ['Name', 'WC', 'Address', 'Balance', 'Kind'], colWidths: [16, 4, 56, 16, 24]
    });
    const spinner = ora('Fetching balances...').start();
    for (let key of store.allKeys) {
        spinner.text = 'Fetching balance ' + key.name;
        let balance = await backoff(() => client.getBalance(key.address));
        table.push([key.name, key.address.workChain + '', key.address.toFriendly(), '' + balance, key.kind]);
    }
    spinner.succeed();
    console.log(table.toString());
    console.log('\n');
}

async function newKeys(client: TonClient, store: { store: KeyStore, name: string }) {

    let res = await prompt<{ workchain: string, kind: string, count: '1' | '10' | '100' | '300', prefix: string }>([{
        type: 'select',
        name: 'workchain',
        message: 'Target workchain',
        choices: [
            { message: 'Basic Workchain', name: '0', hint: '0' },
            { message: 'Masterchain', name: '-1', hint: '-1' },
        ]
    }, {
        type: 'select',
        name: 'kind',
        message: 'Wallet Type',
        choices: [
            { message: 'Wallet v3', name: 'org.ton.wallets.v3', hint: 'default' },
            { message: 'Wallet v3r2', name: 'org.ton.wallets.v3.r2' },
            { message: 'Wallet v2', name: 'org.ton.wallets.v2' },
            { message: 'Wallet v2r2', name: 'org.ton.wallets.v2.r2' },
            { message: 'Wallet v1', name: 'org.ton.wallets.simple', hint: 'unsupported' },
            { message: 'Wallet v1r2', name: 'org.ton.wallets.simple.r2' },
            { message: 'Wallet v1r3', name: 'org.ton.wallets.simple.r3', hint: 'for validator' }
        ]
    }, {
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
    let kind = validateWalletType(res.kind);
    if (!kind) {
        throw Error('Invalid kind');
    }

    // Create keys
    const spinner = ora('Creating keys').start();
    let count = parseInt(res.count, 10);
    let workchain = parseInt(res.workchain, 10);
    let index = 1;
    for (let i = 0; i < count; i++) {
        while (store.store.allKeys.find((v) => v.name === res.prefix + '_' + String(index).padStart(4, '0'))) {
            index++;
        }
        let keyname = res.prefix + '_' + String(index).padStart(4, '0');
        spinner.text = 'Creating key ' + keyname;
        let wallet = await client.createNewWallet({ workchain: workchain, type: kind });
        await store.store.addKey({
            name: keyname,
            address: wallet.wallet.address,
            kind: kind,
            config: '',
            comment: '',
            publicKey: wallet.key.publicKey
        }, Buffer.from(wallet.mnemonic.join(' ')));
    }
    fs.writeFileSync(store.name, await store.store.save());
    spinner.succeed('Keys created');
}

async function importKeys(client: TonClient, store: { store: KeyStore, name: string }) {

    let res = await prompt<{ name: string, kind: string, workchain: string, mnemonics: string }>([{
        type: 'select',
        name: 'workchain',
        message: 'Target workchain',
        choices: [
            { message: 'Basic Workchain', name: '0', hint: '0' },
            { message: 'Masterchain', name: '-1', hint: '-1' },
        ]
    }, {
        type: 'select',
        name: 'kind',
        message: 'Wallet Type',
        choices: [
            { message: 'Wallet v3', name: 'org.ton.wallets.v3', hint: 'default' },
            { message: 'Wallet v3r2', name: 'org.ton.wallets.v3.r2' },
            { message: 'Wallet v2', name: 'org.ton.wallets.v2' },
            { message: 'Wallet v2r2', name: 'org.ton.wallets.v2.r2' },
            { message: 'Wallet v1', name: 'org.ton.wallets.simple', hint: 'unsupported' },
            { message: 'Wallet v1r2', name: 'org.ton.wallets.simple.r2' },
            { message: 'Wallet v1r3', name: 'org.ton.wallets.simple.r3', hint: 'for validator' }
        ]
    }, {
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
    const workchain = parseInt(res.workchain, 10);
    let key = await mnemonicToWalletKey(res.mnemonics.split(' '));
    let kind = validateWalletType(res.kind);
    if (!kind) {
        throw Error('Invalid kind');
    }
    let wallet = await client.openWalletFromSecretKey({ workchain, secretKey: key.secretKey, type: kind });
    await store.store.addKey({
        name: res.name,
        address: wallet.address,
        kind: kind,
        config: '',
        comment: '',
        publicKey: key.publicKey
    }, Buffer.from(res.mnemonics));
    fs.writeFileSync(store.name, await store.store.save());
}

async function transfer(client: TonClient, store: { store: KeyStore, name: string }) {

    // Checl contacts
    let contacts = await openContacts();
    if (contacts.length === 0) {
        console.warn('contacts.json is empty or does not exist');
        return;
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

    // Ask for store password
    const password = await askPassword(store.store);

    // Read key
    const spinner = ora('Loading key').start();
    let target = contacts.find((v) => v.name === res.send_to)!.address;
    let source = store.store.allKeys.find((v) => v.name === res.send_from)!;
    let sourceAddress = source.address;
    let mnemonics = (await store.store.getSecret(res.send_from, password)).toString().split(' ');
    if (!(await mnemonicValidate(mnemonics))) {
        throw Error('Mnemonics are invalid');
    }
    let key = await mnemonicToWalletKey(mnemonics);
    let wallet = await client.openWalletFromAddress({ source: sourceAddress });
    let kind = validateWalletType(source.kind);
    if (!kind) {
        throw Error('Invalid wallet kind');
    }
    await wallet.prepare(sourceAddress.workChain, key.publicKey, kind);

    spinner.text = 'Preparing transfer';
    let seqno = await backoff(() => wallet.getSeqNo());
    let deployed = await backoff(() => client.isContractDeployed(target));
    if (!deployed) {
        spinner.stop();
        let conf = await prompt<{ confirm: string }>([{
            type: 'confirm',
            name: 'confirm',
            message: 'Recepient account is not activated. Do you want to continue?',
            initial: false
        }]);
        if (!conf.confirm) {
            return;
        }
        spinner.start('Sending tranfer');
    } else {
        spinner.text = 'Sending tranfer';
    }
    await backoff(() => wallet.transfer({
        to: target,
        value: toNano(res.amount),
        seqno: seqno,
        secretKey: key.secretKey,
        bounce: deployed
    }));
    spinner.succeed('Transfer sent');
}

async function exportWalletForTon(client: TonClient, store: KeyStore) {
    let res = await prompt<{ export_wallet: string, name: string }>([{
        type: 'select',
        name: 'export_wallet',
        message: 'Export Wallet',
        initial: 0,
        choices: store.allKeys.map((v) => ({
            name: v.name,
            message: v.name,
            hint: v.address.toFriendly()
        }))
    }, {
        type: 'input',
        name: 'name',
        message: 'File name (without extension)',
        initial: 'wallet_0001',
        validate: (src) => {
            if (src.trim().length === 0) {
                return 'Name couldn\'t be empty'
            } else {
                return true;
            }
        }
    }]);


    // Ask for store password
    const password = await askPassword(store);

    // Read key
    const spinner = ora('Loading key').start();
    let source = store.allKeys.find((v) => v.name === res.export_wallet)!.address;
    let mnemonics = (await store.getSecret(res.export_wallet, password)).toString().split(' ');
    if (!(await mnemonicValidate(mnemonics))) {
        throw Error('Mnemonics are invalid');
    }
    let key = await mnemonicToWalletKey(mnemonics);
    let wallet = await client.openWalletDefaultFromSecretKey({ workchain: source.workChain, secretKey: key.secretKey });
    fs.writeFileSync(res.name + '.addr', wallet.address.toBuffer());
    fs.writeFileSync(res.name + '.pk', exportKey(key.secretKey));
    spinner.succeed('Written files ' + res.name + '.addr' + ' and ' + res.name + '.pk');
}

export async function viewKeystore(config: Config) {
    const store = await openKeystore();
    if (!store) {
        return;
    }
    const client = new TonClient({ endpoint: config.test ? 'https://testnet.toncenter.com/api/v2/jsonRPC' : 'https://toncenter.com/api/v2/jsonRPC' });

    while (true) {
        let res = await prompt<{ command: string }>([{
            type: 'select',
            name: 'command',
            message: 'Pick command',
            initial: 0,
            choices: [
                { message: 'List wallets', name: 'list-keys' },
                { message: 'Transfer', name: 'transfer' },
                { message: 'Create wallets', name: 'create-keys' },
                { message: 'Export wallet for TON Node', name: 'export-wallet' },
                { message: 'Import wallets', name: 'import-keys' },
                { message: 'Backup wallets', name: 'backup-keys' },
                { message: 'Exit', name: 'exit' }
            ]
        }]);

        if (res.command === 'import-keys') {
            await importKeys(client, { store: store.store, name: store.name });
        }
        if (res.command === 'list-keys') {
            if (config.offline) {
                await listKeys(store.store);
            } else {
                await listBalances(client, store.store);
            }
        }
        if (res.command === 'create-keys') {
            await newKeys(client, { store: store.store, name: store.name });
        }
        if (res.command === 'transfer') {
            await transfer(client, { store: store.store, name: store.name });
        }
        if (res.command === 'backup-keys') {
            await backupKeys({ store: store.store, name: store.name });
        }
        if (res.command === 'export-wallet') {
            await exportWalletForTon(client, store.store);
        }
        if (res.command === 'exit') {
            return;
        }
    }
}