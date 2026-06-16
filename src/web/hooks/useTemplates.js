import { useCallback, useEffect, useState } from 'react';
import { kv } from '../lib/kvstoreClient';

const COLLECTION = 'whiteboard_templates';

export function useTemplates() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const rows = await kv.list(COLLECTION);
            setTemplates(
                (Array.isArray(rows) ? rows : [])
                    .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
            );
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const saveTemplate = useCallback(async ({ name, description, elements, files }) => {
        const record = {
            name: name.trim(),
            description: (description || '').trim(),
            elements_json: JSON.stringify(elements || []),
            files_json: JSON.stringify(files || []),
            created_at: Date.now(),
            created_by: window.Splunk?.util?.getCurrentUser?.() || '',
        };
        await kv.insert(COLLECTION, record);
        await load();
    }, [load]);

    const deleteTemplate = useCallback(async (id) => {
        await kv.remove(COLLECTION, id);
        setTemplates((prev) => prev.filter((t) => t._key !== id));
    }, []);

    return { templates, loading, error, saveTemplate, deleteTemplate, reload: load };
}
