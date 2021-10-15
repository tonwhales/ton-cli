import { Config } from "../Config";
import ora from "ora";
import { newSecurePassphrase } from "ton-crypto";

export async function newPassphrase(config: Config) {
    const spinner = ora('Generating secure passsphrase');
    let result = await newSecurePassphrase();
    spinner.succeed(result);
    return;
}