import yargs from 'yargs';
import { keyNew } from './commands/keyNew';
import { send } from './commands/send';

yargs.scriptName('ton-cli')
    .usage('$0 <cmd> [args]')
    .command('send', 'Send value', () => { }, async () => {
        await send();
    })
    .command('new-key', 'Create new key', () => { }, async () => {
        await keyNew();
    })
    .help()
    .argv;