import prompt from 'prompt';
import { TonClient } from 'ton';
import fs from 'fs';
import { mnemonicToWalletKey, mnemonicValidate } from 'ton-crypto';

export async function keyImport() {
    prompt.start({ 'message': 'ton-cli' });
    const { name, masterchain, mnemonics } = await prompt.get([{
        name: 'name'
    }, {
        name: 'mnemonics'
    }, {
        name: 'masterchain',
        type: 'boolean',
        default: false
    }]);
    const client = new TonClient({ endpoint: 'https://ton.korshakov.com/jsonRPC' });

    let mn = (mnemonics as string).split(' ').map((v) => v.trim());
    if (!(await mnemonicValidate(mn))) {
        console.warn('Invalid mnemonics: ' + mn);
        return;
    }
    let key = await mnemonicToWalletKey(mn);
    let wallet = await client.openWalletDefaultFromSecretKey({ workchain: masterchain ? -1 : 0, secretKey: key.secretKey });
    console.log('Address: ' + wallet.address.toFriendly());
    fs.writeFileSync(name + '.addr', wallet.address.toBuffer());
    fs.writeFileSync(name + '.backup', mn.join(' '), 'utf-8');
    fs.writeFileSync(name + '.pk', key.secretKey.slice(0, 32));
}