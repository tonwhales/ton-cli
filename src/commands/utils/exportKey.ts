/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function exportKey(source: Buffer) {
    return Buffer.from(source.slice(0, 32));
}