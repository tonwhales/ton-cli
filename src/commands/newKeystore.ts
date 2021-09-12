import { prompt } from 'enquirer';
import fs from 'fs';
import { KeyStore } from 'ton';
import { mnemonicNew } from 'ton-crypto';
import ora from 'ora';

export async function newKeystore() {
    let res = await prompt<{ name: string }>([{
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

    const spinner = ora('Creating a secure keystore').start();

    // Create password
    const mnemonics = await mnemonicNew(24);

    // Create keystore
    let keystore = await KeyStore.createNew(mnemonics.join(' '));

    // Save keystore
    fs.writeFileSync(res.name + '.keystore', await keystore.save())

    // Complete
    spinner.succeed('Keystore password: ' + mnemonics.join(' '));
}