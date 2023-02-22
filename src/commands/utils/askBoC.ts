/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { prompt } from 'enquirer';
import { Cell } from 'ton';

export async function askBoC(args: { message: string, initial?: string }) {
    let p = await prompt<{ data: string }>([{
        type: 'input',
        name: 'data',
        message: args.message,
        initial: args.initial,
        validate: (src) => {
            try {
                Cell.fromBoc(Buffer.from(src, 'base64'))
                return true;
            } catch (e) {
                return false
            }
        }
    }]);
    return Cell.fromBoc(Buffer.from(p.data, 'base64'))[0];
}