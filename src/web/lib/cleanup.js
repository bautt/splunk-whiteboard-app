// Destructive maintenance helper: purge all Whiteboard App data from KV Store.
//
// Intended for use right before uninstalling the app, or to reset an instance to
// a clean state. This deletes EVERY board, its history/snapshots, thumbnails,
// and any legacy template data. There is no undo.
//
// Scope: clears both the shared (app/nobody) namespace — i.e. all shared boards
// for every user — and the CURRENT user's private namespace. Other users'
// private boards live in their own namespaces and can only be cleared by those
// users (or by an admin removing the app, which drops the collections entirely).

import { kv, COLLECTIONS } from './kvstoreClient';
import { BOARD_SCOPE } from './boardScope';

// Every collection the app writes to, including legacy template collections.
const ALL_COLLECTIONS = [
    COLLECTIONS.boards,
    COLLECTIONS.versions,
    COLLECTIONS.revisions,
    COLLECTIONS.thumbnails,
    COLLECTIONS.templateRevisions,
    'whiteboard_templates',
];

const SCOPES = [BOARD_SCOPE.SHARED, BOARD_SCOPE.PRIVATE];

function isBenign(err) {
    // 404 = collection not present in that namespace; nothing to clear.
    return String(err?.message || '').includes('404');
}

/**
 * Delete all Whiteboard App KV Store data.
 *
 * @returns {Promise<{ clearedCollections: number, errors: string[] }>}
 */
export async function purgeAllWhiteboardData() {
    const errors = [];
    let clearedCollections = 0;

    for (const collection of ALL_COLLECTIONS) {
        for (const scope of SCOPES) {
            try {
                // eslint-disable-next-line no-await-in-loop
                await kv.clear(collection, scope);
                clearedCollections += 1;
            } catch (e) {
                if (!isBenign(e)) {
                    errors.push(`${collection} [${scope}]: ${e.message}`);
                }
            }
        }
    }

    return { clearedCollections, errors };
}

export default purgeAllWhiteboardData;
