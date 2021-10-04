import { Config } from '../Config';
import fs from 'fs';
import ora from 'ora';
import { prompt } from 'enquirer';
import { mnemonicToWalletKey, newSecurePassphrase } from 'ton-crypto';
import { Address, KeyStore, TonClient } from 'ton';
import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { restoreWalletSource } from './storage/walletSources';

const codec = t.array(t.type({
    address: t.string,
    name: t.string,
    config: t.string,
    comment: t.string,
    kind: t.string,
    mnemonics: t.array(t.string)
}));

export async function restoreKeystore(config: Config) {
    let dir = fs.readdirSync('.');
    let backups = dir.filter((v) => v.endsWith('.keystore.backup'));
    if (backups.length === 0) {
        ora().fail('No backup files found in current directory.');
        return null;
    }

    let res = await prompt<{ backup: string, name: string }>([{
        type: 'select',
        name: 'backup',
        message: 'Which backup to use?',
        choices: backups
    }, {
        type: 'input',
        name: 'name',
        message: 'Keystore Name',
        validate: (src) => {
            if (fs.existsSync(src + '.keystore')) {
                return 'File ' + src + '.keystore already exist!';
            }
            return true;
        }
    }]);

    let backup = codec.decode(JSON.parse(fs.readFileSync(res.backup, 'utf-8')));
    if (isRight(backup)) {

        // Start creation
        const spinner = ora('Creating a secure keystore').start();

        // Create password
        const passphrase = await newSecurePassphrase(6);

        // Create keystore
        let keystore = await KeyStore.createNew(passphrase);

        // Importing
        const client = new TonClient({ endpoint: '' });
        for (let b of backup.right) {
            spinner.text = 'Importing ' + b.name;

            // Load contract
            let key = await mnemonicToWalletKey(b.mnemonics);
            let address = Address.parseFriendly(b.address).address;
            let contract = restoreWalletSource(b.kind, address, key.publicKey, b.config);
            if (contract.type !== b.kind) {
                throw Error('Contract type mismatch');
            }

            // Check contract and address
            let wallet = await client.openWalletFromCustomContract(contract);
            if (!wallet.address.equals(address)) {
                throw Error('Address mismatch');
            }

            // Backup contract
            let config = contract.backup();

            // Add to keystore
            await keystore.addKey({
                name: b.name,
                address: wallet.address,
                kind: contract.type,
                config: config,
                comment: b.comment,
                publicKey: key.publicKey
            }, Buffer.from(b.mnemonics.join(' ')));
        }
        fs.writeFileSync(res.name + '.keystore', await keystore.save());

        // Complete
        spinner.succeed('Keystore password: ' + passphrase);

    } else {
        console.warn('Invalid backup file')
    }
}