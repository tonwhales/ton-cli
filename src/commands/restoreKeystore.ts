import { Config } from '../Config';
import fs from 'fs';
import ora from 'ora';
import { prompt } from 'enquirer';
import { mnemonicNew, mnemonicToWalletKey } from 'ton-crypto';
import { Address, KeyStore, TonClient } from 'ton';
import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';

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
        const mnemonics = await mnemonicNew(24);

        // Create keystore
        let keystore = await KeyStore.createNew(mnemonics.join(' '));

        // Importing
        const client = new TonClient({ endpoint: '' });
        for (let b of backup.right) {
            spinner.text = 'Importing ' + b.name;
            let address = Address.parseFriendly(b.address).address;
            let key = await mnemonicToWalletKey(b.mnemonics);
            let wallet = await client.openWalletDefaultFromSecretKey({ workchain: address.workChain, secretKey: key.secretKey });
            await keystore.addKey({
                name: b.name,
                address: wallet.address,
                kind: b.kind,
                config: b.config,
                comment: b.comment,
                publicKey: key.publicKey
            }, mnemonics.join(' '), Buffer.from(b.mnemonics.join(' ')));
        }
        fs.writeFileSync(res.name + '.keystore', await keystore.save());

        // Complete
        spinner.succeed('Keystore password: ' + mnemonics.join(' '));

    } else {
        console.warn('Invalid backup file')
    }
}