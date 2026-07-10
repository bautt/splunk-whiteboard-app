// Persists board preview images in a dedicated KV collection, keyed by board id.
// Thumbnails live in the shared (app) namespace so any user who can see a board
// can read its preview, regardless of the board's own scope.

import { kv, COLLECTIONS } from './kvstoreClient';
import { logWarn } from './log';

function isNotFound(err) {
    return String(err?.message || '').includes('404');
}

/** Return the stored preview data URL for a board, or null if none/error. */
export async function getThumbnail(boardId) {
    if (!boardId) return null;
    try {
        const row = await kv.get(COLLECTIONS.thumbnails, boardId);
        return row?.image || null;
    } catch (e) {
        if (!isNotFound(e)) logWarn('Thumbnail read failed', e);
        return null;
    }
}

/** Store (insert or update) a board preview. Best-effort. */
export async function saveThumbnail(boardId, image) {
    if (!boardId || !image) return;
    try {
        await kv.upsert(COLLECTIONS.thumbnails, boardId, {
            image,
            updated_at: Date.now(),
        });
    } catch (e) {
        logWarn('Thumbnail save failed', e);
    }
}

/** Remove a board preview (e.g. when the board is deleted). Best-effort. */
export async function deleteThumbnail(boardId) {
    if (!boardId) return;
    try {
        await kv.remove(COLLECTIONS.thumbnails, boardId);
    } catch (e) {
        if (!isNotFound(e)) logWarn('Thumbnail delete failed', e);
    }
}
