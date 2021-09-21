export function exportKey(source: Buffer) {
    return Buffer.from(source.slice(0, 32));
}