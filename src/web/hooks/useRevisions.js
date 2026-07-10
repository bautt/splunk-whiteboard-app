import { useCallback, useEffect, useState } from 'react';
import { deleteRevision, listRevisions } from '../lib/historyStore';
import { BOARD_SCOPE } from '../lib/boardScope';

export function useRevisions(boardId, scopeKey = BOARD_SCOPE.SHARED) {
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
            setRevisions(await listRevisions(boardId, scopeKey));
        } finally {
            setLoading(false);
        }
    }, [boardId, scopeKey]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const removeRevision = useCallback(
        async (revisionId) => {
            await deleteRevision(revisionId, scopeKey);
            await refresh();
        },
        [scopeKey, refresh]
    );

    return { revisions, loading, refresh, deleteRevision: removeRevision };
}
