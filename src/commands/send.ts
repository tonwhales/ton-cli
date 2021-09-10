import prompt from 'prompt';
import { Address, toNano, TonClient } from 'ton';
import fs from 'fs';
import { mnemonicToWalletKey } from 'ton-crypto';

export async function send() {
    prompt.start({ 'message': 'ton-cli' });
    const { name, amount, to, masterchain } = await prompt.get([{
        name: 'name'
    }, {
        name: 'amount',
        type: 'number',
    }, {
        name: 'to'
    }, {
        name: 'masterchain',
        type: 'boolean',
        default: false
    }]);

    const client = new TonClient({ endpoint: 'https://ton.korshakov.com/jsonRPC' });
    let mnemonics = fs.readFileSync(name + '.backup', 'utf-8').split(' ').map((v) => v.trim());
    let key = await mnemonicToWalletKey(mnemonics);
    let wallet = await client.openWalletDefaultFromSecretKey({ workchain: masterchain ? -1 : 0, secretKey: key.secretKey });
    let seqno = await wallet.getSeqNo();
    await wallet.transfer({
        seqno,
        to: Address.parseFriendly(to as string).address,
        bounce: false,
        value: toNano(amount as number),
        secretKey: key.secretKey
    });
}