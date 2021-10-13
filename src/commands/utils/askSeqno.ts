import { prompt } from 'enquirer';

export async function askSeqno() {
    let p = await prompt<{ seqno: string }>([{
        type: 'input',
        name: 'seqno',
        message: 'Current Wallet\'s seqno',
        validate: (v) => parseInt(v).toString() === v
    }]);
    return parseInt(p.seqno);
}