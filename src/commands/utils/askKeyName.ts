import { prompt } from 'enquirer';
import { KeyStore } from 'ton';

export async function askKeyName(message: string, args: { store: KeyStore, suffixes?: string[] }) {
    let p = await prompt<{ name: string }>([{
        type: 'input',
        name: 'name',
        message: message,
        validate: (src) => {
            if (args.suffixes && args.suffixes.length > 0) {
                for (let s of args.suffixes) {
                    if (args.store.allKeys.find((v) => v.name === src + s)) {
                        return 'Key already exist';
                    }
                }
            } else {
                if (args.store.allKeys.find((v) => v.name === src)) {
                    return 'Key already exist';
                }
            }
            return true;
        }
    }]);
    return p.name;
}