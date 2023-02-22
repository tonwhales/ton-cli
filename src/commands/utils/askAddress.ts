/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { prompt } from 'enquirer';
import { Address } from 'ton';

export async function askAddress(args: { message: string, initial?: string }) {
    let p = await prompt<{ data: string }>([{
        type: 'input',
        name: 'data',
        message: args.message,
        initial: args.initial,
        validate: (src) => {
            try {
                Address.parseFriendly(src);
                return true;
            } catch (e) {
                return false;
            }
        }
    }]);
    return Address.parseFriendly(p.data).address;
}