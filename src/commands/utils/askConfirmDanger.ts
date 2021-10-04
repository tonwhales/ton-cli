import { prompt } from 'enquirer';

export async function askConfirmDanger(message: string, value: string) {
    let conf = await prompt<{ confirm: string }>([{
        type: 'input',
        name: 'confirm',
        message: message,
        validate: (src) => (src === value) || src.length === 0
    }]);
    return conf.confirm !== '';
}