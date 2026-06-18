import { useCallback, useEffect, useState } from 'react';
import { kv } from '../lib/kvstoreClient';
import { getCurrentUser } from '../lib/currentUser';
import {
    deleteAllTemplateRevisions,
    revisionBeforeTemplateUpdate,
    TEMPLATE_REVISION_SOURCES,
} from '../lib/templateHistoryStore';

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
            created_by: getCurrentUser(),
        };
        await kv.insert(COLLECTION, record);
        await load();
    }, [load]);

    const updateTemplate = useCallback(async (id, { name, description, elements, files }, options = {}) => {
        const existing = await kv.get(COLLECTION, id);
        if (!existing) throw new Error('Template not found');
        if (options.skipRevision !== true) {
            await revisionBeforeTemplateUpdate(
                id,
                existing,
                options.revisionSource || TEMPLATE_REVISION_SOURCES.UPDATE
            );
        }
        const record = {
            name: name.trim(),
            description: (description || '').trim(),
            elements_json: JSON.stringify(elements || []),
            files_json: JSON.stringify(files || []),
            created_at: existing.created_at ?? Date.now(),
            created_by: existing.created_by ?? '',
            updated_at: Date.now(),
            updated_by: getCurrentUser(),
        };
        await kv.update(COLLECTION, id, record);
        await load();
    }, [load]);

    const deleteTemplate = useCallback(async (id) => {
        await deleteAllTemplateRevisions(id);
        await kv.remove(COLLECTION, id);
        setTemplates((prev) => prev.filter((t) => t._key !== id));
    }, []);

    return { templates, loading, error, saveTemplate, updateTemplate, deleteTemplate, reload: load };
}
