import { prompt } from 'enquirer';

export async function askBounce() {
    let conf = await prompt<{ confirm: boolean }>([{
        type: 'confirm',
        name: 'confirm',
        message: 'Bounce if recepient is not initialized',
        initial: true
    }]);
    return conf.confirm;
}