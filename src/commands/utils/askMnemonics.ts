import { prompt } from 'enquirer';
import { mnemonicValidate } from 'ton-crypto';

export async function askMnemonics(message: string) {
    let p = await prompt<{ mnemonics: string }>([{
        type: 'input',
        name: 'mnemonics',
        message,
        validate: (src) => mnemonicValidate(src.split(' '))
    }]);
    return p.mnemonics.split(' ');
}