import { kv, COLLECTIONS } from './kvstoreClient';
import { BOARD_SCOPE, BOARD_VISIBILITY, scopeForVisibility, visibilityForScope } from './boardScope';
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

/** An explicit, recognised visibility value on a raw KV row (or null). */
function explicitRowVisibility(row) {
    const v = row?.visibility;
    return v === BOARD_VISIBILITY.SHARED || v === BOARD_VISIBILITY.PRIVATE ? v : null;
}

/**
 * List shared boards plus the current user's private boards.
 *
 * Boards live in a single `whiteboards` KV collection. Querying it through both
 * the app (shared) and user (private) namespace lenses returns the *same*
 * physical record twice for boards that predate RBAC, which surfaced the same
 * board as both "Shared" and "Private" — and deleting either card removed the
 * one underlying record ("delete one, delete both"). We therefore de-duplicate
 * by `_key`:
 *   - A row carrying an explicit `visibility` field wins over one that doesn't.
 *   - Legacy rows with no `visibility` field default to shared, and the board's
 *     scope is derived from its resolved visibility so writes/deletes target the
 *     correct namespace.
 */
export async function listAccessibleBoards() {
    const [sharedRows, privateRows] = await Promise.all([
        kv.list(COLLECTIONS.boards, BOARD_SCOPE.SHARED).catch(() => []),
        kv.list(COLLECTIONS.boards, BOARD_SCOPE.PRIVATE).catch(() => []),
    ]);

    const rowsByKey = new Map();
    const consider = (row) => {
        if (!row?._key) return;
        const prev = rowsByKey.get(row._key);
        // Prefer a row that declares an explicit visibility over one that doesn't.
        if (!prev || (!explicitRowVisibility(prev) && explicitRowVisibility(row))) {
            rowsByKey.set(row._key, row);
        }
    };
    (sharedRows || []).forEach(consider);
    (privateRows || []).forEach(consider);

    const boards = Array.from(rowsByKey.values()).map((row) => {
        // Legacy boards (no visibility field) are treated as shared; align the
        // scope to the resolved visibility so it maps to a single namespace.
        const visibility = explicitRowVisibility(row) || BOARD_VISIBILITY.SHARED;
        return deserializeRow(row, scopeForVisibility(visibility));
    });
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
