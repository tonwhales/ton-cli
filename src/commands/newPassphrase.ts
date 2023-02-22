/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Config } from "../Config";
import ora from "ora";
import { newSecurePassphrase } from "ton-crypto";

export async function newPassphrase(config: Config) {
    const spinner = ora('Generating secure passsphrase');
    let result = await newSecurePassphrase();
    spinner.succeed(result);
    return;
}