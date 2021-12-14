import { Config } from "../Config";
import { askConfirm } from "./utils/askConfirm";
import { askText } from "./utils/askText";
import { createADNLKey } from "./utils/createADNLKey";
import fs from 'fs';
import ora from "ora";

export async function newKey(config: Config) {
    console.log('Prefix of an address (3 letters max, ASCII only)');
    let prefix = await askText({ message: 'Name prefix' });

    while (true) {
        console.log('Searching for name...');
        for (let i = 0; i < 1000; i++) {
            const key = await createADNLKey(Buffer.from([]));
            if (key.friendlyName.startsWith(prefix)) {
                console.warn(key.friendlyName);
                let confirm = await askConfirm('Do you want to use this name?', true);
                if (confirm) {
                    fs.writeFileSync(key.name, key.key);
                    return;
                }
                console.log('Searching for name...');
            }
        }
        let again = await askConfirm('No prefixes found, do you want to try again?');
        if (!again) {
            return;
        }
    }
}