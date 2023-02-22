/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Address, TonClient } from "ton";
import nacl from 'tweetnacl';
import { exportKey } from "./exportKey";

describe('exportKey', () => {
    it('should export key correctly', async () => {
        let addressFriendly = 'kf_1g5xkp8asoCQkFwJ7y3lLBo2iUvx3mOuWMQYctltIPobU';
        let testAddress = Buffer.from('9YOcZKfGrKAkJBcCe8t5SwaNolL8d5jrljEGHLZbSD7/////', 'base64');
        let workchain = testAddress[testAddress.length - 1];
        let hash = testAddress.slice(0, testAddress.length - 4);
        let address = new Address(-1, hash);
        expect(workchain).toBe(0xff);
        expect(address.toFriendly({ testOnly: true })).toBe(addressFriendly);

        let testKey = Buffer.from('PMHUOkegQnZCabMJTRgQYGgVpx2+aNluvPq32uQE2qk=', 'base64');
        let client = new TonClient({ endpoint: '' });
        let wallet = await client.openWalletFromAddress({ source: address });
        let publicKey = nacl.sign.keyPair.fromSeed(testKey);
        await wallet.prepare(-1, Buffer.from(publicKey.publicKey), 'org.ton.wallets.simple.r3');
        expect(exportKey(Buffer.from(publicKey.secretKey))).toEqual(testKey);
    });
});