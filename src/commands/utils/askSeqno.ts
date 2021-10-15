import { prompt } from 'enquirer';
import qr from 'qrcode-terminal';
import { Address } from 'ton';
import { Config } from '../../Config';

export async function askSeqno(address: Address, config: Config) {
    console.log('You can find current seqno by scanning this code. If seqno is unknown then put zero.')
    console.log(qr.generate(`https://${config.testnet ? 'test.' : ''}tonwhales.com/tools/state?` + new URLSearchParams({ address: address.toFriendly() }), { small: true }));

    let p = await prompt<{ seqno: string }>([{
        type: 'input',
        name: 'seqno',
        message: 'Current Wallet\'s seqno',
        validate: (v) => parseInt(v).toString() === v
    }]);
    return parseInt(p.seqno);
}