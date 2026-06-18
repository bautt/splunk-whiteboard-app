import { kv, COLLECTIONS } from './kvstoreClient';
import { filesToArray, rehydrateMissingFiles } from './boardFiles';
import { sanitizeElementsForPersistence } from './build';
import { getCurrentUser } from './currentUser';
import { debug, logWarn } from './log';

export const MAX_REVISIONS_PER_BOARD = 30;
export const MAX_SNAPSHOTS_PER_BOARD = 20;

export const REVISION_SOURCES = {
    AUTOSAVE: 'autosave',
    MANUAL_SAVE: 'manual_save',
    PRE_RESTORE: 'pre_restore',
};

export function sourceLabel(source) {
    switch (source) {
        case REVISION_SOURCES.AUTOSAVE:
            return 'Auto-save';
        case REVISION_SOURCES.MANUAL_SAVE:
            return 'Manual save';
        case REVISION_SOURCES.PRE_RESTORE:
            return 'Before restore';
        default:
            return source || 'Revision';
    }
}

export function snapshotPayload({ elements, appState, files }) {
    const sanitized = sanitizeElementsForPersistence(elements || []);
    return {
        elements: sanitized,
        appState: appState || {},
        files: filesToArray(files),
        elementCount: sanitized.length,
    };
}

export function parseSnapshotJson(snapshotJson) {
    let snapshot = { elements: [], appState: {}, files: [] };
    try {
        snapshot = JSON.parse(snapshotJson || '{}');
    } catch {
        // tolerate corrupt rows
    }
    const elements = sanitizeElementsForPersistence(snapshot.elements || []);
    const files = rehydrateMissingFiles(elements, snapshot.files || []);
    return {
        elements,
        appState: snapshot.appState || {},
        files,
        elementCount: elements.length,
    };
}

export function deserializeRevision(row) {
    const snap = parseSnapshotJson(row.snapshot_json);
    return {
        id: row._key,
        boardId: row.board_id,
        kind: 'revision',
        source: row.source || REVISION_SOURCES.AUTOSAVE,
        label: row.label || '',
        createdAt: Number(row.created_at) || 0,
        createdBy: row.created_by || '',
        elementCount: Number(row.element_count) || snap.elementCount,
        elements: snap.elements,
        appState: snap.appState,
        files: snap.files,
    };
}

export function deserializeSnapshot(row) {
    const snap = parseSnapshotJson(row.snapshot_json);
    return {
        id: row._key,
        boardId: row.board_id,
        kind: 'snapshot',
        source: 'manual_snapshot',
        label: row.label || '',
        createdAt: Number(row.created_at) || 0,
        createdBy: '',
        elementCount: snap.elementCount,
        elements: snap.elements,
        appState: snap.appState,
        files: snap.files,
    };
}

async function pruneCollection(collection, boardId, maxKeep, boardField = 'board_id') {
    const rows = await kv.query(collection, {
        query: JSON.stringify({ [boardField]: boardId }),
        sort: 'created_at:-1',
    });
    const all = rows || [];
    const stale = all.slice(maxKeep);
    await Promise.all(stale.map((r) => kv.remove(collection, r._key)));
}

/** Persist an automatic revision (autosave, manual save, pre-restore). */
export async function insertRevision(boardId, { elements, appState, files, source, label }) {
    if (!boardId) return;
    const snap = snapshotPayload({ elements, appState, files });
    if (snap.elementCount === 0 && source !== REVISION_SOURCES.PRE_RESTORE) {
        debug('revision skipped (0 elements)');
        return;
    }
    await kv.insert(COLLECTIONS.revisions, {
        board_id: boardId,
        source: source || REVISION_SOURCES.AUTOSAVE,
        label: label || '',
        element_count: snap.elementCount,
        created_by: getCurrentUser(),
        created_at: Date.now(),
        snapshot_json: JSON.stringify({
            elements: snap.elements,
            appState: snap.appState,
            files: snap.files,
        }),
    });
    await pruneCollection(COLLECTIONS.revisions, boardId, MAX_REVISIONS_PER_BOARD);
    debug(`revision saved (${source}, ${snap.elementCount} elements)`);
}

/** Snapshot existing KV board state before a canvas overwrite. */
export async function revisionBeforeBoardWrite(boardId, existingParsed, saveSource) {
    const elements = existingParsed?.elements || [];
    if (!elements.length) return;
    try {
        await insertRevision(boardId, {
            elements,
            appState: existingParsed.appState,
            files: existingParsed.files,
            source: saveSource || REVISION_SOURCES.AUTOSAVE,
        });
    } catch (e) {
        logWarn('Auto-revision before save failed', e);
    }
}

export async function listRevisions(boardId) {
    if (!boardId) return [];
    const rows = await kv.query(COLLECTIONS.revisions, {
        query: JSON.stringify({ board_id: boardId }),
        sort: 'created_at:-1',
    });
    return (rows || []).map(deserializeRevision);
}

export async function deleteRevision(revisionId) {
    await kv.remove(COLLECTIONS.revisions, revisionId);
}

export async function insertNamedSnapshot(boardId, { elements, appState, files, label }) {
    const snap = snapshotPayload({ elements, appState, files });
    await kv.insert(COLLECTIONS.versions, {
        board_id: boardId,
        label: label || '',
        snapshot_json: JSON.stringify({
            elements: snap.elements,
            appState: snap.appState,
            files: snap.files,
        }),
        created_at: Date.now(),
    });
    await pruneCollection(COLLECTIONS.versions, boardId, MAX_SNAPSHOTS_PER_BOARD);
}

export async function listSnapshots(boardId) {
    if (!boardId) return [];
    const rows = await kv.query(COLLECTIONS.versions, {
        query: JSON.stringify({ board_id: boardId }),
        sort: 'created_at:-1',
    });
    return (rows || []).map(deserializeSnapshot);
}

export async function deleteSnapshot(versionId) {
    await kv.remove(COLLECTIONS.versions, versionId);
}

async function deleteAllFromCollection(collection, entityId, idField = 'board_id') {
    const rows = await kv.query(collection, {
        query: JSON.stringify({ [idField]: entityId }),
    });
    await Promise.all((rows || []).map((r) => kv.remove(collection, r._key)));
}

/** Remove all revision and snapshot rows when a board is deleted. */
export async function deleteAllBoardHistory(boardId) {
    if (!boardId) return;
    await Promise.all([
        deleteAllFromCollection(COLLECTIONS.revisions, boardId),
        deleteAllFromCollection(COLLECTIONS.versions, boardId),
    ]);
}
