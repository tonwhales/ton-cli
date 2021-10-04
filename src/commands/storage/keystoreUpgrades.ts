import fs from 'fs';
import { KeyStore } from "ton";
import { restoreWalletSource } from './walletSources';

export async function needUpgrade(store: KeyStore) {
    for (let s of store.allKeys) {
        if (s.config === '') {
            return true;
        }
    }
    return false;
}

export async function doUpgrade(store: KeyStore, password: string, name: string) {

    // Backup
    let existing = fs.readFileSync(name);
    let backupFile = name + '.upgrade-backup';
    let bIndex = 0;
    while (fs.existsSync(backupFile)) {
        bIndex++;
        backupFile = name + '.upgrade-backup.' + bIndex;
    }
    fs.writeFileSync(backupFile, existing);

    // Upgrading
    for (let s of store.allKeys) {
        if (s.config === '') {
            let source = restoreWalletSource(s.kind, s.address, s.publicKey, s.config);
            let config = source.backup();
            let key = await store.getSecret(s.name, password);
            store.removeKey(s.name);
            await store.addKey({
                name: s.name,
                address: s.address,
                kind: source.type,
                config: config,
                comment: s.comment,
                publicKey: s.publicKey
            }, key);
        }
    }

    // Persist
    fs.writeFileSync(name, await store.save());
}