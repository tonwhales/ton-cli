import { mnemonicToWalletKey } from "ton-crypto";
import { Config } from "../Config";
import { askAddress } from "./utils/askAddress";
import { askMnemonics } from "./utils/askMnemonics";
import { askText } from "./utils/askText";
import { exportKey } from "./utils/exportKey";
import fs from 'fs';

export async function writeRawWallet(config: Config) {
    let name = await askText({ message: 'File name', initial: 'wallet_0001' });
    let address = await askAddress({ message: 'Wallet address' });
    let mnemonics = await askMnemonics('Private key mnemonics');

    let key = await mnemonicToWalletKey(mnemonics);
    fs.writeFileSync(name + '.addr', address.toBuffer());
    fs.writeFileSync(name + '.pk', exportKey(key.secretKey));
}