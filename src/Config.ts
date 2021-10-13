import { TonClient } from "ton";

export type Config = {
    offline: boolean,
    testnet: boolean,
    client: TonClient
};