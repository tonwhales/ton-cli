/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Config } from "../Config";
import ora from "ora";
import { mnemonicNew } from "ton-crypto";

export async function newMnemonics(config: Config) {
    const spinner = ora('Generating secure mnemonics');
    let result = await mnemonicNew();
    spinner.succeed(result.join(' '));
    return;
}