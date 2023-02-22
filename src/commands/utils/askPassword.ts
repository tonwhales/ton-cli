/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { prompt } from 'enquirer';
import { KeyStore } from 'ton';

export async function askPassword(store: KeyStore) {
    let p = await prompt<{ password: string }>([{
        type: 'password',
        name: 'password',
        message: 'Keystore password',
        validate: async (src) => {
            return await store.checkPassword(src);
        }
    }]);
    return p.password;
}