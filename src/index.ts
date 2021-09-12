import { prompt } from 'enquirer';
import { newKeystore } from './commands/newKeystore';
import { viewKeystore } from './commands/viewKeystore';

(async () => {
    try {
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
            await newKeystore();
        }
        if (res.command === 'open-keystore') {
            await viewKeystore();
        }
    } catch (e) {
        console.warn(e);
    }
})();