import yargs from 'yargs';
import { keyImport } from './commands/keyImport';
import { keyNew } from './commands/keyNew';
import { send } from './commands/send';

yargs.scriptName('ton-cli')
    .usage('$0 <cmd> [args]')
    .command('import-key', 'Import key', () => { }, async () => {
        await keyImport();
    })
    .command('send', 'Send value', () => { }, async () => {
        await send();
    })
    .command('new-key', 'Create new key', () => { }, async () => {
        await keyNew();
    })
    .help()
    .argv;