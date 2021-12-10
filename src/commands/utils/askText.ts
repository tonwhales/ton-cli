import { prompt } from 'enquirer';

export async function askText(args: { message: string, initial?: string }) {
    let p = await prompt<{ data: string }>([{
        type: 'input',
        name: 'data',
        message: args.message,
        initial: args.initial,
    }]);
    return p.data;
}