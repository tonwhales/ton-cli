/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

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