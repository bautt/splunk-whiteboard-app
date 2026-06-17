import { useCallback, useEffect, useState } from 'react';
import { kv, COLLECTIONS } from '../lib/kvstoreClient';
import { filesToArray, rehydrateMissingFiles } from '../lib/boardFiles';

const MAX_VERSIONS_PER_BOARD = 20;

function deserialize(row) {
    let snapshot = { elements: [], appState: {}, files: [] };
    try {
        snapshot = JSON.parse(row.snapshot_json || '{}');
    } catch {
        // ignore
    }
    const elements = snapshot.elements || [];
    const files = rehydrateMissingFiles(elements, snapshot.files || []);
    return {
        id: row._key,
        boardId: row.board_id,
        label: row.label || '',
        createdAt: Number(row.created_at) || 0,
        elements,
        appState: snapshot.appState || {},
        files,
    };
}

export function useVersions(boardId) {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        if (!boardId) {
            setVersions([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const rows = await kv.query(COLLECTIONS.versions, {
                query: JSON.stringify({ board_id: boardId }),
                sort: 'created_at:-1',
            });
            setVersions((rows || []).map(deserialize));
        } finally {
            setLoading(false);
        }
    }, [boardId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const saveSnapshot = useCallback(
        async (label, elements, appState, files) => {
            if (!boardId) return;
            const doc = {
                board_id: boardId,
                label: label || '',
                snapshot_json: JSON.stringify({
                    elements,
                    appState,
                    files: filesToArray(files),
                }),
                created_at: Date.now(),
            };
            await kv.insert(COLLECTIONS.versions, doc);

            // prune anything beyond MAX_VERSIONS_PER_BOARD
            const rows = await kv.query(COLLECTIONS.versions, {
                query: JSON.stringify({ board_id: boardId }),
                sort: 'created_at:-1',
            });
            const all = (rows || []).map(deserialize);
            const stale = all.slice(MAX_VERSIONS_PER_BOARD);
            await Promise.all(stale.map((v) => kv.remove(COLLECTIONS.versions, v.id)));

            await refresh();
        },
        [boardId, refresh]
    );

    const deleteVersion = useCallback(
        async (versionId) => {
            await kv.remove(COLLECTIONS.versions, versionId);
            await refresh();
        },
        [refresh]
    );

    return { versions, loading, saveSnapshot, deleteVersion, refresh };
}
