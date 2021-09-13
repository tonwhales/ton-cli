import { prompt } from 'enquirer';
import { newKeystore } from './commands/newKeystore';
import { viewKeystore } from './commands/viewKeystore';

import yargs from 'yargs';
import { Config } from './Config';
import { restoreKeystore } from './commands/restoreKeystore';

(async () => {
    try {

        let parsed = await yargs
            .scriptName("ton-cli")
            .usage('$0 ton-cli [args]')
            .boolean('test')
            .boolean('offline')
            .parseAsync();

        const config: Config = {
            test: parsed.test ? true : false,
            offline: parsed.offline ? true : false
        }
        if (config.test) {
            console.warn('Running in TEST mode');
        }

        let res = await prompt<{ command: string }>([{
            type: 'select',
            name: 'command',
            message: 'Pick command',
            initial: 0,
            choices: [
                { message: 'Open keystore', name: 'open-keystore' },
                { message: 'Create keystore', name: 'new-keystore' },
                { message: 'Restore keystore', name: 'restore-keystore' },
            ]
        }]);
        if (res.command === 'new-keystore') {
            await newKeystore(config);
        }
        if (res.command === 'open-keystore') {
            await viewKeystore(config);
        }
        if (res.command === 'restore-keystore') {
            await restoreKeystore(config);
        }
    } catch (e) {
        console.warn(e);
    }
})();