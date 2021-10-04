import { prompt } from 'enquirer';
import { Address } from 'ton';

export async function askAddress(args: { message: string, initial?: string }) {
    let p = await prompt<{ data: string }>([{
        type: 'input',
        name: 'data',
        message: args.message,
        initial: args.initial,
        validate: (src) => {
            try {
                Address.parseFriendly(src);
                return true;
            } catch (e) {
                return false;
            }
        }
    }]);
    return Address.parseFriendly(p.data).address;
}