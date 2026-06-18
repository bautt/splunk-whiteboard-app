import { useCallback, useEffect, useState } from 'react';
import { deleteTemplateRevision, listTemplateRevisions } from '../lib/templateHistoryStore';

export function useTemplateRevisions(templateId) {
    const [revisions, setRevisions] = useState([]);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!templateId) {
            setRevisions([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            setRevisions(await listTemplateRevisions(templateId));
        } finally {
            setLoading(false);
        }
    }, [templateId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const removeRevision = useCallback(
        async (revisionId) => {
            await deleteTemplateRevision(revisionId);
            await refresh();
        },
        [refresh]
    );

    return { revisions, loading, refresh, deleteRevision: removeRevision };
}
