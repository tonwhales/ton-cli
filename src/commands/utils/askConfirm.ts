import { prompt } from 'enquirer';

export async function askConfirm(message: string, initial: boolean = false) {
    let conf = await prompt<{ confirm: boolean }>([{
        type: 'confirm',
        name: 'confirm',
        message: message,
        initial: initial
    }]);
    return conf.confirm;
}