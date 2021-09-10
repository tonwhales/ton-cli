import prompt from 'prompt';
import { TonClient } from 'ton';
import fs from 'fs';

export async function keyNew() {
    prompt.start({ 'message': 'ton-cli' });
    const { name, masterchain } = await prompt.get([{
        name: 'name'
    }, {
        name: 'masterchain',
        type: 'boolean',
        default: false
    }]);
    const client = new TonClient({ endpoint: 'https://ton.korshakov.com/jsonRpc' });
    let wallet = await client.createNewWallet({ workchain: masterchain ? -1 : 0 });
    console.log('Address: ' + wallet.wallet.address.toFriendly());
    console.log('Mnemonics: ' + wallet.mnemonic.join(' '));
    fs.writeFileSync(name + '.addr', wallet.wallet.address.toBuffer());
    fs.writeFileSync(name + '.backup', wallet.mnemonic.join(' '), 'utf-8');
    fs.writeFileSync(name + '.pk', wallet.key.secretKey.slice(0, 32));
}