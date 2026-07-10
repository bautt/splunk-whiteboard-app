import { kv, COLLECTIONS } from './kvstoreClient';
import { BOARD_SCOPE, BOARD_VISIBILITY, visibilityForScope } from './boardScope';
import { filesToArray, rehydrateMissingFiles } from './boardFiles';
import { sanitizeElementsForPersistence } from './build';

function deserializeRow(row, scopeKey) {
    let elements = [];
    let appState = {};
    let files = [];
    try {
        const parsed = JSON.parse(row.elements_json || '{}');
        elements = parsed.elements || [];
        appState = parsed.appState || {};
        files = parsed.files || [];
    } catch {
        // tolerate corrupt rows
    }
    files = rehydrateMissingFiles(elements, files);
    elements = sanitizeElementsForPersistence(elements);
    const visibility = visibilityForScope(scopeKey, row.visibility);
    return {
        id: row._key,
        name: row.name || 'Untitled',
        tags: row.tags || '',
        owner: row.owner || '',
        visibility,
        scope: scopeKey,
        updatedAt: Number(row.updated_at) || 0,
        elements,
        appState,
        files,
    };
}

function isNotFoundError(err) {
    const msg = String(err?.message || '');
    return msg.includes('404') || msg.toLowerCase().includes('not found');
}

/** Load a board from shared (nobody) or private (user) namespace. */
export async function fetchBoard(boardId) {
    if (!boardId) return null;

    try {
        const sharedRow = await kv.get(COLLECTIONS.boards, boardId, BOARD_SCOPE.SHARED);
        if (sharedRow) {
            return deserializeRow(sharedRow, BOARD_SCOPE.SHARED);
        }
    } catch (e) {
        if (!isNotFoundError(e)) throw e;
    }

    try {
        const privateRow = await kv.get(COLLECTIONS.boards, boardId, BOARD_SCOPE.PRIVATE);
        if (privateRow) {
            return deserializeRow(privateRow, BOARD_SCOPE.PRIVATE);
        }
    } catch (e) {
        if (!isNotFoundError(e)) throw e;
    }

    return null;
}

/** List shared boards plus the current user's private boards. */
export async function listAccessibleBoards() {
    const [sharedRows, privateRows] = await Promise.all([
        kv.list(COLLECTIONS.boards, BOARD_SCOPE.SHARED).catch(() => []),
        kv.list(COLLECTIONS.boards, BOARD_SCOPE.PRIVATE).catch(() => []),
    ]);

    const boards = [
        ...(sharedRows || []).map((row) => deserializeRow(row, BOARD_SCOPE.SHARED)),
        ...(privateRows || []).map((row) => deserializeRow(row, BOARD_SCOPE.PRIVATE)),
    ];
    boards.sort((a, b) => b.updatedAt - a.updatedAt);
    return boards;
}

export function serializeBoardPayload({ elements, appState, files }) {
    return JSON.stringify({
        elements: sanitizeElementsForPersistence(elements || []),
        appState: appState || {},
        files: filesToArray(files),
    });
}
