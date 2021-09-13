import { prompt } from 'enquirer';
import { newKeystore } from './commands/newKeystore';
import { viewKeystore } from './commands/viewKeystore';

import yargs from 'yargs';
import { Config } from './Config';

(async () => {
    try {

        let parsed = await yargs
            .scriptName("ton-cli")
            .usage('$0 ton-cli [args]')
            .boolean('test')
            .parseAsync();

        const config: Config = {
            test: parsed.test ? true : false
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
                { message: 'Create keystore', name: 'new-keystore' },
                { message: 'Open keystore', name: 'open-keystore' }
            ]
        }]);
        if (res.command === 'new-keystore') {
            await newKeystore(config);
        }
        if (res.command === 'open-keystore') {
            await viewKeystore(config);
        }
    } catch (e) {
        console.warn(e);
    }
})();