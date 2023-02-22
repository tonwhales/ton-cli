/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Config } from "../Config";
import fs from 'fs';
import ora from 'ora';
import { prompt } from 'enquirer';
import { backoff } from "@openland/patterns";

export async function sendFile(config: Config) {
    let dir = fs.readdirSync('.');
    let files = dir.filter((v) => v.endsWith('.boc'));
    if (config.offline) {
        ora().fail('Unable to send files in offline mode');
        return;
    }
    if (files.length === 0) {
        ora().fail('No *.boc files found in current directory.');
        return;
    }

    let res = await prompt<{ file: string }>([{
        type: 'select',
        name: 'file',
        message: 'Which file to send?',
        choices: files,
    }]);

    // Read file
    let data = fs.readFileSync(res.file);
    if (config.offline) {
        ora().succeed('Unable to send file in offline mode');
        return;
    }

    // Send file
    const spinner = ora('Sending file...').start();
    let iteration = 0;
    backoff(async () => {
        iteration++;
        if (iteration > 1) {
            spinner.text = 'Sending file... (attempt ' + iteration + ')';
        }
        await config.client.sendFile(data);
    });
    spinner.succeed('File send');
}