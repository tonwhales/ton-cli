import { getSecureRandomBytes, keyPairFromSecretKey, keyPairFromSeed } from 'ton-crypto'

function crc16(data: Buffer) {
    const poly = 0x1021;
    let reg = 0;
    const message = Buffer.alloc(data.length + 2);
    message.set(data);
    for (let byte of message) {
        let mask = 0x80;
        while (mask > 0) {
            reg <<= 1;
            if (byte & mask) {
                reg += 1;
            }
            mask >>= 1
            if (reg > 0xffff) {
                reg &= 0xffff;
                reg ^= poly;
            }
        }
    }
    return Buffer.from([Math.floor(reg / 256), reg % 256]);
}

const base32Symbols = 'abcdefghijklmnopqrstuvwxyz234567';
function base32Encode(data: Buffer) {
    let bits = 0
    let value = 0
    let output = ''

    for (let i = 0; i < data.length; i++) {
        value = (value << 8) | data[i];
        bits += 8

        while (bits >= 5) {
            output += base32Symbols[(value >>> (bits - 5)) & 31]
            bits -= 5
        }
    }

    if (bits > 0) {
        output += base32Symbols[(value << (5 - bits)) & 31]
    }
    return output;
}

export async function createADNLFriendlyName(src: Buffer) {
    if (src.length !== 32) {
        throw Error('Inavlid source name');
    }
    const data = Buffer.concat([
        Buffer.from([0x2d]),
        src,
        crc16(Buffer.concat([Buffer.from([0x2d]), src]))
    ]);

    return base32Encode(data).slice(1);
}

export async function createADNLKey() {
    const seed = await getSecureRandomBytes(32);
    const key = keyPairFromSeed(seed);
    const name = key.publicKey.toString('hex').toUpperCase();
    const friendlyName = await createADNLFriendlyName(key.publicKey);
    return {
        name,
        friendlyName,
        key: Buffer.concat([Buffer.from([0x17, 0x23, 0x68, 0x49]), key.secretKey.slice(0, 32)])
    }
}