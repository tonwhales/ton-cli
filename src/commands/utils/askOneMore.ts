import { prompt } from 'enquirer';
export async function askOneMore() {
    let res = await prompt<{ again: boolean }>([{
        type: 'confirm',
        name: 'again',
        message: 'One more?',
        initial: false
    }]);

    return res.again;
}