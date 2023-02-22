/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

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