import { Config } from "../Config";
import ora from "ora";
import { mnemonicNew } from "ton-crypto";

export async function newMnemonics(config: Config) {
    const spinner = ora('Generating secure mnemonics');
    let result = await mnemonicNew();
    spinner.succeed(result.join(' '));
    return;
}