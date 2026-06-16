// Compact random id generator suitable for Excalidraw element ids.
// Not cryptographic — only needs to be unique within a board session.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function nanoid(length = 16) {
    const arr = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(arr);
    } else {
        for (let i = 0; i < length; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    let out = '';
    for (let i = 0; i < length; i++) out += ALPHABET[arr[i] % ALPHABET.length];
    return out;
}
