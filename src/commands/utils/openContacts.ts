import fs from 'fs';
import { Address } from 'ton';
import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';

const codec = t.array(t.type({
    name: t.string,
    address: t.string
}));

export async function openContacts() {
    let contacts: { name: string, address: Address }[] = [];
    if (fs.existsSync('contacts.json')) {
        let parsed = JSON.parse(fs.readFileSync('contacts.json', 'utf-8'));
        let res = codec.decode(parsed);
        if (isRight(res)) {
            for (let r of res.right) {
                contacts.push({ name: r.name, address: Address.parseFriendly(r.address).address });
            }
        }
    }
    return contacts;
}