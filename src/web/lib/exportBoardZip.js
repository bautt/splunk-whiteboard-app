import { zipSync, strToU8 } from 'fflate';

import { buildBoardBundle } from './boardBundle';

export function safeBoardFileBase(name) {
    return (name || 'whiteboard').replace(/[^a-zA-Z0-9._-]+/g, '_') || 'whiteboard';
}

/** Unique `.whiteboard.json` path inside a zip (dedupes by board id when names collide). */
export function uniqueBoardZipEntry(board, used) {
    const base = safeBoardFileBase(board.name);
    let entry = `${base}.whiteboard.json`;
    if (!used.has(entry)) {
        used.add(entry);
        return entry;
    }
    const id = String(board.id || '').replace(/[^a-zA-Z0-9_-]+/g, '').slice(0, 12);
    if (id) {
        entry = `${base}-${id}.whiteboard.json`;
        if (!used.has(entry)) {
            used.add(entry);
            return entry;
        }
    }
    let n = 2;
    do {
        entry = `${base}-${n}.whiteboard.json`;
        n += 1;
    } while (used.has(entry));
    used.add(entry);
    return entry;
}

/** Zip each board as its own `.whiteboard.json` file (not a single collection JSON). */
export function buildBoardsZipBlob(boards, appVersion) {
    const used = new Set();
    const archive = {};
    for (const board of boards) {
        const bundle = buildBoardBundle({
            name: board.name,
            elements: board.elements,
            appState: board.appState,
            files: board.files,
            appVersion,
        });
        const entry = uniqueBoardZipEntry(board, used);
        archive[entry] = strToU8(`${JSON.stringify(bundle, null, 2)}\n`);
    }
    const zipped = zipSync(archive, { level: 6 });
    return new Blob([zipped], { type: 'application/zip' });
}
