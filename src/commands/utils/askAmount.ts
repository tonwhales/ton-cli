import BN from 'bn.js';
import { prompt } from 'enquirer';
import { toNano } from 'ton';

export async function askAmount() {
    let { amount } = await prompt<{ amount: number }>({
        type: 'numeral',
        name: 'amount',
        message: 'Amount',
        initial: 0
    });
    return toNano(amount);
}