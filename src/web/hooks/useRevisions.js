import { useCallback, useEffect, useState } from 'react';
import { deleteRevision, listRevisions } from '../lib/historyStore';

export function useRevisions(boardId) {
    const [revisions, setRevisions] = useState([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        if (!boardId) {
            setRevisions([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            setRevisions(await listRevisions(boardId));
        } finally {
            setLoading(false);
        }
    }, [boardId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const removeRevision = useCallback(
        async (revisionId) => {
            await deleteRevision(revisionId);
            await refresh();
        },
        [refresh]
    );

    return { revisions, loading, refresh, deleteRevision };
}
