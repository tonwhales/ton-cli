import { prompt } from 'enquirer';
import { KeyStore } from 'ton';

export async function askPassword(store: KeyStore) {
    let p = await prompt<{ password: string }>([{
        type: 'password',
        name: 'password',
        message: 'Keystore password',
        validate: async (src) => {
            return await store.checkPassword(src);
        }
    }]);
    return p.password;
}