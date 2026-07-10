import { useCallback, useEffect, useState } from 'react';
import {
    deleteSnapshot,
    insertNamedSnapshot,
    listSnapshots,
    MAX_SNAPSHOTS_PER_BOARD,
} from '../lib/historyStore';
import { BOARD_SCOPE } from '../lib/boardScope';

export function useVersions(boardId, scopeKey = BOARD_SCOPE.SHARED) {
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
            setVersions(await listSnapshots(boardId, scopeKey));
        } finally {
            setLoading(false);
        }
    }, [boardId, scopeKey]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const saveSnapshot = useCallback(
        async (label, elements, appState, files) => {
            if (!boardId) return;
            await insertNamedSnapshot(boardId, { label, elements, appState, files }, scopeKey);
            await refresh();
        },
        [boardId, scopeKey, refresh]
    );

    const deleteVersion = useCallback(
        async (versionId) => {
            await deleteSnapshot(versionId, scopeKey);
            await refresh();
        },
        [scopeKey, refresh]
    );

    return { versions, loading, saveSnapshot, deleteVersion, refresh, maxSnapshots: MAX_SNAPSHOTS_PER_BOARD };
}
