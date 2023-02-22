/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

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