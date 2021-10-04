import { prompt } from 'enquirer';
import { KeyStore } from 'ton';

export async function askKeyName(message: string, store: KeyStore) {
    let p = await prompt<{ name: string }>([{
        type: 'input',
        name: 'name',
        message: message,
        validate: (src) => {
            if (store.allKeys.find((v) => v.name === src)) {
                return 'Key already exist';
            }
            return true;
        }
    }]);
    return p.name;
}