import { createADNLFriendlyName } from "./createADNLKey";

describe('createADNLKey', () => {
    it('should create key', async () => {
        const name = '6C8154D2F7C8A134028C209695B40E55EB109B45D2BC8A02337393FD714BDB07';
        const friendly = 'vwicvgs67ekcnacrqqjnfnubzk6wee3ixjlzcqcgnzzh7lrjpnqp3h6';
        // const privateKey = Buffer.from('FyNoSVLOKJR2XehMtKFfCORpTXT8IfBNUTxRaVLnGaCppRU4', 'base64');
        expect(await createADNLFriendlyName(Buffer.from(name, 'hex'))).toEqual(friendly);

        // TODO: Check key
        // const key = await createADNLKey(Buffer.from(name, 'hex'), privateKey);
        // expect(key.friendlyName).toEqual(friendly);
        // expect(key.name).toEqual(name);
        // expect(key.key.publicKey)
    });
});