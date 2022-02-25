import { fromNano, KeyStore, SendMode, toNano, validateWalletType } from "ton";
import { askPassword } from "./utils/askPassword";
import { openKeystore } from "./utils/openKeystore";
import { prompt } from 'enquirer';
import { mnemonicNew, mnemonicToWalletKey, mnemonicValidate } from "ton-crypto";
import fs from 'fs';
import Table from 'cli-table';
import ora from "ora";
import { backoff } from '@openland/patterns';
import { Config } from "../Config";
import { openContacts } from "./utils/openContacts";
import { askConfirm } from "./utils/askConfirm";
import { askText } from "./utils/askText";
import { exportKey } from "./utils/exportKey";
import { createGenericWalletSource, restoreWalletSource } from "./storage/walletSources";
import { askMnemonics } from "./utils/askMnemonics";
import { ValidatorControllerSource, WhitelistedWalletSource } from "ton-contracts";
import { contractAddress } from "ton";
import { askAddress } from "./utils/askAddress";
import { askKeyName } from "./utils/askKeyName";
import { askConfirmDanger } from "./utils/askConfirmDanger";
import { backupSingleTemplate, backupTemplate } from "./backup/backupTemplate";
import { askSeqno } from "./utils/askSeqno";
import { askBounce } from "./utils/askBounce";
import qr from 'qrcode-terminal';

async function listKeys(config: Config, store: KeyStore) {
    var table = new Table({
        head: ['Name', 'WC', 'Address', 'Kind'], colWidths: [36, 4, 56, 32]
    });
    for (let key of store.allKeys) {
        table.push([key.name, key.address.workChain + '', key.address.toFriendly(), key.kind])
    }
    console.log(table.toString());
    console.log('\n');
}

async function backupKeys(config: Config, store: { store: KeyStore, name: string }) {

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

async function backupPaper(config: Config, store: { store: KeyStore, name: string }) {

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
    let backup: { name: string, address: string, comment: string, config: string, description: string, kind: string, mnemonics: string[] }[] = [];
    const spinner = ora('Exporting keys...').start();
    for (let key of store.store.allKeys) {
        spinner.text = 'Exporting key ' + key.name;
        let mnemonics = (await store.store.getSecret(key.name, password)).toString().split(' ');
        if (!(await mnemonicValidate(mnemonics))) {
            throw Error('Mnemonics are invalid');
        }

        // Resolve description
        let contractSource = restoreWalletSource(key.kind, key.address, key.publicKey, key.config);
        let description = contractSource.describe();

        backup.push({ name: key.name, comment: key.comment, config: key.config, kind: key.kind, description: description, address: key.address.toFriendly(), mnemonics });
    }

    // Persist
    let data = backupTemplate(backup);
    fs.writeFileSync(destName + '.html', data);
    spinner.succeed();
}

async function backupPaperSingle(config: Config, store: { store: KeyStore, name: string }) {

    // Confirm
    if (!(await askConfirm('Backup stores keys in UNENCRYPTED FORM. Are you sure want to export unencrypted keys to disk?'))) {
        return;
    }

    // Ask for wallet
    let wallet = (await prompt<{ wallet: string }>([{
        type: 'select',
        name: 'wallet',
        message: 'Wallet to backup',
        initial: 0,
        choices: store.store.allKeys.map((v) => ({
            name: v.name,
            message: v.name,
            hint: v.address.toFriendly()
        }))
    }])).wallet;

    // Ask for password
    const password = await askPassword(store.store);

    // Ask for name
    let destName = await askText({ message: 'Backup name', initial: wallet });

    // Backup
    const spinner = ora('Exporting key...').start();

    // Resolve key
    const key = store.store.allKeys.find((v) => v.name === wallet)!;
    let mnemonics = (await store.store.getSecret(key.name, password)).toString().split(' ');
    if (!(await mnemonicValidate(mnemonics))) {
        throw Error('Mnemonics are invalid');
    }

    // Resolve description
    let contractSource = restoreWalletSource(key.kind, key.address, key.publicKey, key.config);
    let description = contractSource.describe();

    // Backup
    let data = backupSingleTemplate({ name: key.name, comment: key.comment, config: key.config, kind: key.kind, description: description, address: key.address.toFriendly(), mnemonics });
    fs.writeFileSync(destName + '.html', data);

    // Complete
    spinner.succeed();
}

async function revealSingle(config: Config, store: { store: KeyStore, name: string }) {

    // Confirm
    if (!(await askConfirm('This operation whould show secret key in UNENCRYPTED FORM. Are you sure want to display secret key?'))) {
        return;
    }

    // Ask for wallet
    let wallet = (await prompt<{ wallet: string }>([{
        type: 'select',
        name: 'wallet',
        message: 'Wallet to reveal',
        initial: 0,
        choices: store.store.allKeys.map((v) => ({
            name: v.name,
            message: v.name,
            hint: v.address.toFriendly()
        }))
    }])).wallet;

    // Ask for password
    const password = await askPassword(store.store);
    let spinner = ora('Loading key...').start();
    const key = store.store.allKeys.find((v) => v.name === wallet)!;
    let mnemonics = (await store.store.getSecret(key.name, password)).toString().split(' ');
    if (!(await mnemonicValidate(mnemonics))) {
        throw Error('Mnemonics are invalid');
    }
    spinner.stop();

    // Print
    var table = new Table({
        colWidths: [24, 24, 24]
    });
    for (let i = 0; i < 8; i++) {
        table.push([(i + 1) + '. ' + mnemonics[i], (i + 9) + '. ' + mnemonics[i + 8], (i + 17) + '. ' + mnemonics[i + 16]]);
    }
    console.log(table.toString());
    console.log('\n');
}

async function revealAddress(config: Config, store: { store: KeyStore, name: string }) {

    // Ask for wallet
    let wallet = (await prompt<{ wallet: string }>([{
        type: 'select',
        name: 'wallet',
        message: 'Wallet to reveal',
        initial: 0,
        choices: store.store.allKeys.map((v) => ({
            name: v.name,
            message: v.name,
            hint: v.address.toFriendly()
        }))
    }])).wallet;
    const key = store.store.allKeys.find((v) => v.name === wallet)!;

    console.log('Name:     ' + wallet);
    console.log('Address:  ' + key.address.toFriendly());
    console.log('Contract: ' + key.kind);
    console.log(qr.generate('ton://transfer/' + key.address.toFriendly(), { small: true }));
}


async function listBalances(config: Config, store: KeyStore) {
    var table = new Table({
        head: ['Name', 'WC', 'Address', 'Balance', 'Kind', 'Status'], colWidths: [36, 4, 56, 16, 32, 24]
    });
    const spinner = ora('Fetching balances...').start();
    for (let key of store.allKeys) {
        spinner.text = 'Fetching balance ' + key.name;
        let balance = await backoff(() => config.client.getBalance(key.address));
        let state: string = (await backoff(() => config.client.getContractState(key.address))).state;
        if ((key.kind === 'org.ton.wallets.whitelisted' || key.kind === 'org.ton.validator.controller') && state === 'active') {
            let cooldown = parseInt((await backoff(() => config.client.callGetMethod(key.address, 'restricted_cooldown'))).stack[0][1], 16);
            if (cooldown > 0) {
                state = 'cooldown ' + cooldown + ' s';
            }
        }
        table.push([key.name, key.address.workChain + '', key.address.toFriendly(), fromNano(balance), key.kind, state]);
    }
    spinner.succeed();
    console.log(table.toString());
    console.log('\n');
}

async function newKeys(config: Config, store: { store: KeyStore, name: string }) {

    let res = await prompt<{ workchain: string, kind: string }>([{
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
            { message: 'Wallet v1r3', name: 'org.ton.wallets.simple.r3', hint: 'for validator' },
            { message: 'Restricted (Whitelisted)', name: 'org.ton.wallets.whitelisted', hint: 'restricted wallet' },
            { message: 'Validator Controller', name: 'org.ton.validator.controller', hint: 'Secure wallet for validators' }
        ]
    }]);

    // Resolve workchain
    let workchain = parseInt(res.workchain, 10);

    // Custom wallets
    if (res.kind === 'org.ton.wallets.whitelisted') {

        // Creaste keys
        const spinner = ora('Creating keys').start();
        const masterMnemonics = await mnemonicNew();
        const masterKey = await mnemonicToWalletKey(masterMnemonics);
        const restrictedMnemonics = await mnemonicNew();
        const restrictedKey = await mnemonicToWalletKey(restrictedMnemonics);
        spinner.stop();

        // Ask for whitelisted address
        const whitelistedAddress = await askAddress({ message: 'Whitelisted address' });
        const source = WhitelistedWalletSource.create({
            workchain,
            masterKey: masterKey.publicKey,
            restrictedKey: restrictedKey.publicKey,
            whitelistedAddress: whitelistedAddress
        });
        const address = contractAddress(source);
        const sourceConfig = source.backup();

        // Ask for name
        const basicName = await askKeyName('Key Name', { store: store.store, suffixes: ['_restricted', '_master'] });

        await store.store.addKey({
            name: basicName + '_restricted',
            address: address,
            kind: source.type,
            config: sourceConfig,
            comment: '',
            publicKey: restrictedKey.publicKey
        }, Buffer.from(restrictedMnemonics.join(' ')));
        await store.store.addKey({
            name: basicName + '_master',
            address: address,
            kind: source.type,
            config: sourceConfig,
            comment: '',
            publicKey: masterKey.publicKey
        }, Buffer.from(masterMnemonics.join(' ')));

        // Write to disk
        fs.writeFileSync(store.name, await store.store.save());

        return;
    }

    if (res.kind === 'org.ton.validator.controller') {

        // Creaste keys
        const spinner = ora('Creating keys').start();
        const masterMnemonics = await mnemonicNew();
        const masterKey = await mnemonicToWalletKey(masterMnemonics);
        const restrictedMnemonics = await mnemonicNew();
        const restrictedKey = await mnemonicToWalletKey(restrictedMnemonics);
        spinner.stop();

        // Ask for whitelisted address
        const whitelistedAddress = await askAddress({ message: 'Elector address' });
        const source = ValidatorControllerSource.create({
            workchain,
            masterKey: masterKey.publicKey,
            restrictedKey: restrictedKey.publicKey,
            whitelistedAddress: whitelistedAddress
        });
        const address = contractAddress(source);
        const sourceConfig = source.backup();

        // Ask for name
        const basicName = await askKeyName('Key Name', { store: store.store, suffixes: ['_restricted', '_master'] });

        await store.store.addKey({
            name: basicName + '_restricted',
            address: address,
            kind: source.type,
            config: sourceConfig,
            comment: '',
            publicKey: restrictedKey.publicKey
        }, Buffer.from(restrictedMnemonics.join(' ')));
        await store.store.addKey({
            name: basicName + '_master',
            address: address,
            kind: source.type,
            config: sourceConfig,
            comment: '',
            publicKey: masterKey.publicKey
        }, Buffer.from(masterMnemonics.join(' ')));

        // Write to disk
        fs.writeFileSync(store.name, await store.store.save());

        return;
    }


    // Generic wallet
    let kind = validateWalletType(res.kind);
    if (!kind) {
        throw Error('Invalid kind');
    }
    let genericConfig = await prompt<{ count: '1' | '10' | '100' | '300', prefix: string }>([{
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
    let count = parseInt(genericConfig.count, 10);
    let index = 1;
    for (let i = 0; i < count; i++) {
        while (store.store.allKeys.find((v) => v.name === genericConfig.prefix + '_' + String(index).padStart(4, '0'))) {
            index++;
        }
        let keyname = genericConfig.prefix + '_' + String(index).padStart(4, '0');
        spinner.text = 'Creating key ' + keyname;
        let wallet = await config.client.createNewWallet({ workchain: workchain, type: kind });
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

async function importKeys(config: Config, store: { store: KeyStore, name: string }) {

    let res = await prompt<{ kind: string, workchain: string }>([{
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
            { message: 'Wallet v1r3', name: 'org.ton.wallets.simple.r3', hint: 'for validator' },
            { message: 'Restricted (Whitelisted)', name: 'org.ton.wallets.whitelisted', hint: 'restricted wallet' },
            { message: 'Validator Controller', name: 'org.ton.validator.controller', hint: 'Secure wallet for validators' }
        ]
    }]);

    // Resolve parameters
    const workchain = parseInt(res.workchain, 10);

    // Custom contract
    if (res.kind === 'org.ton.wallets.whitelisted') {

        // Key Parameters
        const restrictedMnemonics = await askMnemonics('Restricted Key mnemonics');
        const masterMnemonics = await askMnemonics('Main Key mnemonics');
        const whitelistedAddress = await askAddress({ message: 'Whitelisted address' });

        // Create contract
        let restrictedKey = await mnemonicToWalletKey(restrictedMnemonics);
        let masterKey = await mnemonicToWalletKey(masterMnemonics);
        let source = WhitelistedWalletSource.create({
            masterKey: masterKey.publicKey,
            restrictedKey: restrictedKey.publicKey,
            workchain,
            whitelistedAddress: whitelistedAddress
        });
        let address = contractAddress(source);
        let sourceConfig = source.backup();

        // Persist keys
        const basicName = await askKeyName('Key Name', { store: store.store, suffixes: ['_restricted', '_master'] });
        await store.store.addKey({
            name: basicName + '_restricted',
            address: address,
            kind: source.type,
            config: sourceConfig,
            comment: '',
            publicKey: restrictedKey.publicKey
        }, Buffer.from(restrictedMnemonics.join(' ')));
        await store.store.addKey({
            name: basicName + '_master',
            address: address,
            kind: source.type,
            config: sourceConfig,
            comment: '',
            publicKey: masterKey.publicKey
        }, Buffer.from(masterMnemonics.join(' ')));

        // Write to disk
        fs.writeFileSync(store.name, await store.store.save());

        return;
    }

    if (res.kind === 'org.ton.validator.controller') {

        // Key Parameters
        const restrictedMnemonics = await askMnemonics('Restricted Key mnemonics');
        const masterMnemonics = await askMnemonics('Main Key mnemonics');
        const whitelistedAddress = await askAddress({ message: 'Elector address' });

        // Create contract
        let restrictedKey = await mnemonicToWalletKey(restrictedMnemonics);
        let masterKey = await mnemonicToWalletKey(masterMnemonics);
        let source = ValidatorControllerSource.create({
            masterKey: masterKey.publicKey,
            restrictedKey: restrictedKey.publicKey,
            workchain,
            whitelistedAddress: whitelistedAddress
        });
        let address = contractAddress(source);
        let sourceConfig = source.backup();

        // Persist keys
        const basicName = await askKeyName('Key Name', { store: store.store, suffixes: ['_restricted', '_master'] });
        await store.store.addKey({
            name: basicName + '_restricted',
            address: address,
            kind: source.type,
            config: sourceConfig,
            comment: '',
            publicKey: restrictedKey.publicKey
        }, Buffer.from(restrictedMnemonics.join(' ')));
        await store.store.addKey({
            name: basicName + '_master',
            address: address,
            kind: source.type,
            config: sourceConfig,
            comment: '',
            publicKey: masterKey.publicKey
        }, Buffer.from(masterMnemonics.join(' ')));

        // Write to disk
        fs.writeFileSync(store.name, await store.store.save());

        return;
    }

    // Generic contract
    const name = await askKeyName('Key name', { store: store.store });
    const mnemonics = await askMnemonics('Key mnemonics');
    let key = await mnemonicToWalletKey(mnemonics);
    let source = createGenericWalletSource(res.kind, workchain, key.publicKey);
    let address = contractAddress(source);
    let sourceConfig = source.backup();

    // Persist contract
    await store.store.addKey({
        name: name,
        address: address,
        kind: source.type,
        config: sourceConfig,
        comment: '',
        publicKey: key.publicKey
    }, Buffer.from(mnemonics.join(' ')));
    fs.writeFileSync(store.name, await store.store.save());
}

async function deleteKey(config: Config, store: { store: KeyStore, name: string }) {
    let res = await prompt<{ wallet: string }>([{
        type: 'select',
        name: 'wallet',
        message: 'Wallet to delete',
        initial: 0,
        choices: store.store.allKeys.map((v) => ({
            name: v.name,
            message: v.name,
            hint: v.address.toFriendly()
        }))
    }]);

    if (!(await askConfirmDanger('Are you sure want to delete key ' + res.wallet + '? Type wallet name to proceed', res.wallet))) {
        return;
    }

    store.store.removeKey(res.wallet);
    fs.writeFileSync(store.name, await store.store.save());
}

async function transfer(config: Config, store: { store: KeyStore, name: string }) {

    // Check contacts
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
        message: 'Amount (zero for all)',
        initial: 0
    }]);

    // Flags
    let amount = res.amount;
    let paySeparatly: boolean = await askConfirm('Include gas fees separately?', true);
    let transferAll: boolean = false;
    let destroyOnZero: boolean = false;
    if (amount <= 0) {
        transferAll = await askConfirm('Do you want to transfer everyting?', false);
        if (!transferAll) {
            return;
        }
        destroyOnZero = await askConfirm('Do you want to destroy contract after transfer?', false);
        if (!(await askConfirm('Make sure that you have at least 0.15 in your account.', true))) {
            return;
        }
        amount = 0.1;
    }

    // Mode
    let sendMode = SendMode.IGNORE_ERRORS;
    if (paySeparatly) {
        sendMode |= SendMode.PAY_GAS_SEPARATLY;
    }
    if (transferAll) {
        sendMode |= SendMode.CARRRY_ALL_REMAINING_BALANCE;
    }
    if (destroyOnZero) {
        sendMode |= SendMode.DESTROY_ACCOUNT_IF_ZERO;
    }

    // Ask for store password
    const password = await askPassword(store.store);

    // Read key
    const spinner = ora('Loading key').start();
    let target = contacts.find((v) => v.name === res.send_to)!.address;
    let source = store.store.allKeys.find((v) => v.name === res.send_from)!;
    let mnemonics = (await store.store.getSecret(res.send_from, password)).toString().split(' ');
    if (!(await mnemonicValidate(mnemonics))) {
        throw Error('Mnemonics are invalid');
    }
    let key = await mnemonicToWalletKey(mnemonics);

    // Create wallet
    let contractSource = restoreWalletSource(source.kind, source.address, source.publicKey, source.config);
    let wallet = await config.client.openWalletFromCustomContract(contractSource);

    //
    // Prepare
    //
    let seqno: number;
    let bounce: boolean;
    // let mode: SendMode = SendMode.IGNORE_ERRORS + SendMode.PAY_GAS_SEPARATLY;
    if (config.offline) {
        spinner.stop();
        seqno = await askSeqno(wallet.address, config);
        bounce = await askBounce();
    } else {
        spinner.text = 'Preparing transfer';
        seqno = await backoff(() => wallet.getSeqNo());
        bounce = await backoff(() => config.client.isContractDeployed(target));
        spinner.stop();
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
    }

    //
    // Signing
    //

    spinner.start('Signing');
    let signed = await wallet.transferSign({
        to: target,
        value: toNano(amount),
        seqno: seqno,
        secretKey: key.secretKey,
        bounce,
        sendMode,
        timeout: Math.floor(Date.now() / 1000) + (config.offline ? 600 /* 5 min */ : 60 /* 1 min */)
    });
    let boc = await signed.toBoc({ idx: false });

    //
    // Sending
    //

    if (config.offline) {
        spinner.succeed('Scan this qr with your phone to send this transaction. Transaction valid only for 60 seconds!.');
        console.log(qr.generate(`https://${config.testnet ? 'test.' : ''}tonwhales.com/tools/send?${new URLSearchParams({
            data: boc.toString('base64url'),
            exp: (Math.floor(Date.now() / 1000) + 60).toString(),
        }).toString()}`, { small: true }));
    } else {
        spinner.text = 'Sending';
        await backoff(() => config.client.sendFile(boc));
        spinner.succeed('Transfer sent');
    }
}

async function exportWalletForTon(config: Config, store: KeyStore) {
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
                return 'Name couldn\'t be empty';
            } else {
                return true;
            }
        }
    }]);


    // Ask for store password
    const password = await askPassword(store);

    // Read key
    const spinner = ora('Loading key').start();
    let source = store.allKeys.find((v) => v.name === res.export_wallet)!;
    let sourceAddress = source.address;
    let mnemonics = (await store.getSecret(res.export_wallet, password)).toString().split(' ');
    if (!(await mnemonicValidate(mnemonics))) {
        throw Error('Mnemonics are invalid');
    }
    let key = await mnemonicToWalletKey(mnemonics);
    fs.writeFileSync(res.name + '.addr', sourceAddress.toBuffer());
    fs.writeFileSync(res.name + '.pk', exportKey(key.secretKey));
    spinner.succeed('Written files ' + res.name + '.addr' + ' and ' + res.name + '.pk');
}

export async function viewKeystore(config: Config) {
    const store = await openKeystore();
    if (!store) {
        return;
    }
    while (true) {
        let res = await prompt<{ command: string }>([{
            type: 'select',
            name: 'command',
            message: 'Pick command',
            initial: 0,
            choices: [
                { message: 'List wallets', name: 'list-keys' },
                { message: 'Transfer', name: 'transfer' },
                { message: 'Show wallet', name: 'show-wallet' },
                { message: 'Create wallet', name: 'create-keys' },
                { message: 'Delete wallet', name: 'delete-key' },
                { message: 'Import wallet', name: 'import-keys' },
                { message: 'Backup wallets', name: 'backup-keys' },
                { message: 'Paper backup keystore', name: 'backup-paper-keys' },
                { message: 'Paper backup wallet', name: 'backup-paper-wallet' },
                { message: 'Reveal wallet key', name: 'reveal-wallet' },
                { message: 'Export wallet for TON Node', name: 'export-wallet' },
                { message: 'Exit', name: 'exit' }
            ]
        }]);

        if (res.command === 'delete-key') {
            await deleteKey(config, { store: store.store, name: store.name });
        }
        if (res.command === 'import-keys') {
            await importKeys(config, { store: store.store, name: store.name });
        }
        if (res.command === 'list-keys') {
            if (config.offline) {
                await listKeys(config, store.store);
            } else {
                await listBalances(config, store.store);
            }
        }
        if (res.command === 'create-keys') {
            await newKeys(config, { store: store.store, name: store.name });
        }
        if (res.command === 'transfer') {
            await transfer(config, { store: store.store, name: store.name });
        }
        if (res.command === 'backup-keys') {
            await backupKeys(config, { store: store.store, name: store.name });
        }
        if (res.command === 'backup-paper-keys') {
            await backupPaper(config, { store: store.store, name: store.name });
        }
        if (res.command === 'backup-paper-wallet') {
            await backupPaperSingle(config, { store: store.store, name: store.name });
        }
        if (res.command === 'reveal-wallet') {
            await revealSingle(config, { store: store.store, name: store.name });
        }
        if (res.command === 'show-wallet') {
            await revealAddress(config, { store: store.store, name: store.name });
        }
        if (res.command === 'export-wallet') {
            await exportWalletForTon(config, store.store);
        }
        if (res.command === 'exit') {
            return;
        }
    }
}