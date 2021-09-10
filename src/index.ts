import yargs from 'yargs';
import { keyNew } from './commands/keyNew';

yargs.scriptName('ton-cli')
    .usage('$0 <cmd> [args]')
    // .command('export', 'Export key from mnemonics', () => { }, async () => {

    // })
    .command('new-key', 'Create new key', () => { }, async () => {
        await keyNew();
    })
    .help()
    .argv;