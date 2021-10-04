import fs from 'fs';
import ora from 'ora';
import { prompt } from 'enquirer';
import { KeyStore } from 'ton';
import { needUpgrade, doUpgrade } from '../storage/keystoreUpgrades';
import { askConfirm } from './askConfirm';
import { askPassword } from './askPassword';

export async function openKeystore() {
    let dir = fs.readdirSync('.');
    let keystores = dir.filter((v) => v.endsWith('.keystore'));
    if (keystores.length === 0) {
        ora().fail('No keystores found in current directory. Create a new one.');
        return null;
    }

    let res = await prompt<{ keystore: string }>([{
        type: 'select',
        name: 'keystore',
        message: 'Which keystore to use?',
        choices: keystores,
    }]);

    let store = await KeyStore.load(fs.readFileSync(res.keystore));

    // Upgrading
    if (await needUpgrade(store)) {
        if (await askConfirm('Keystore need to be upgraded. Do you want to proceed?', false)) {

            // Fetching password
            let password = await askPassword(store);

            let s = ora().start('Upgrading....');
            await doUpgrade(store, password, res.keystore);
            store = await KeyStore.load(fs.readFileSync(res.keystore));
            s.stop();
        } else {
            return null;
        }
    }

    return { store, name: res.keystore };
}