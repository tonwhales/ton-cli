/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
    Address,
    WalletV1R1Source,
    WalletV1R2Source,
    WalletV1R3Source,
    WalletV2R1Source,
    WalletV2R2Source,
    WalletV3R1Source,
    WalletV3R2Source
} from "ton";
import { ValidatorControllerSource, WhitelistedWalletSource } from "ton-contracts";

export function createGenericWalletSource(kind: string, workChain: number, publicKey: Buffer) {
    // V1 Wallets
    if (kind === 'org.ton.wallets.simple') {
        return WalletV1R1Source.create({ publicKey, workchain: workChain });
    }
    if (kind === 'org.ton.wallets.simple.r2') {
        return WalletV1R2Source.create({ publicKey, workchain: workChain });
    }
    if (kind === 'org.ton.wallets.simple.r3') {
        return WalletV1R3Source.create({ publicKey, workchain: workChain });
    }

    // V2 Wallets
    if (kind === 'org.ton.wallets.v2') {
        return WalletV2R1Source.create({ publicKey, workchain: workChain });
    }
    if (kind === 'org.ton.wallets.v2.r2') {
        return WalletV2R2Source.create({ publicKey, workchain: workChain });
    }

    // V3 Wallets
    if (kind === 'org.ton.wallets.v3') {
        return WalletV3R1Source.create({ publicKey, workchain: workChain });
    }
    if (kind === 'org.ton.wallets.v3.r2') {
        return WalletV3R2Source.create({ publicKey, workchain: workChain });
    }

    throw Error('Unknown wallet kind: ' + kind);
}

export function restoreWalletSource(kind: string, address: Address, publicKey: Buffer, config: string) {

    // V1 Wallets
    if (kind === 'org.ton.wallets.simple') {
        if (config === '') {
            return WalletV1R1Source.create({ publicKey, workchain: address.workChain });
        }
        return WalletV1R1Source.restore(config);
    }
    if (kind === 'org.ton.wallets.simple.r2') {
        if (config === '') {
            return WalletV1R2Source.create({ publicKey, workchain: address.workChain });
        }
        return WalletV1R2Source.restore(config);
    }
    if (kind === 'org.ton.wallets.simple.r3') {
        if (config === '') {
            return WalletV1R3Source.create({ publicKey, workchain: address.workChain });
        }
        return WalletV1R3Source.restore(config);
    }

    // V2 Wallets
    if (kind === 'org.ton.wallets.v2') {
        if (config === '') {
            return WalletV2R1Source.create({ publicKey, workchain: address.workChain });
        }
        return WalletV2R1Source.restore(config);
    }
    if (kind === 'org.ton.wallets.v2.r2') {
        if (config === '') {
            return WalletV2R2Source.create({ publicKey, workchain: address.workChain });
        }
        return WalletV2R2Source.restore(config);
    }

    // V3 Wallets
    if (kind === 'org.ton.wallets.v3') {
        if (config === '') {
            return WalletV3R1Source.create({ publicKey, workchain: address.workChain });
        }
        return WalletV3R1Source.restore(config);
    }
    if (kind === 'org.ton.wallets.v3.r2') {
        if (config === '') {
            return WalletV3R2Source.create({ publicKey, workchain: address.workChain });
        }
        return WalletV3R2Source.restore(config);
    }

    // Custom
    if (kind === 'org.ton.wallets.whitelisted') {
        return WhitelistedWalletSource.restore(config);
    }
    if (kind === 'org.ton.validator.controller') {
        return ValidatorControllerSource.restore(config);
    }

    throw Error('Unknown wallet kind: ' + kind);
}