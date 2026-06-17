import { useCallback, useEffect, useState } from 'react';
import {
    deleteSnapshot,
    insertNamedSnapshot,
    listSnapshots,
    MAX_SNAPSHOTS_PER_BOARD,
} from '../lib/historyStore';

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
            setVersions(await listSnapshots(boardId));
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
            await insertNamedSnapshot(boardId, { label, elements, appState, files });
            await refresh();
        },
        [boardId, refresh]
    );

    const deleteVersion = useCallback(
        async (versionId) => {
            await deleteSnapshot(versionId);
            await refresh();
        },
        [refresh]
    );

    return { versions, loading, saveSnapshot, deleteVersion, refresh, maxSnapshots: MAX_SNAPSHOTS_PER_BOARD };
}
