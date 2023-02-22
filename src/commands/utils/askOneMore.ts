/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

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