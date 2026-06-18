import { kv, COLLECTIONS } from './kvstoreClient';
import { filesToArray, rehydrateMissingFiles } from './boardFiles';
import { sanitizeElementsForPersistence } from './build';
import { debug, logWarn } from './log';

export const MAX_REVISIONS_PER_TEMPLATE = 30;

export const TEMPLATE_REVISION_SOURCES = {
    UPDATE: 'update',
    PRE_RESTORE: 'pre_restore',
};

function getCurrentUser() {
    try {
        return window.Splunk?.util?.getCurrentUser?.() || window.$C?.USERNAME || 'unknown';
    } catch {
        return 'unknown';
    }
}

export function templateRevisionSourceLabel(source) {
    switch (source) {
        case TEMPLATE_REVISION_SOURCES.UPDATE:
            return 'Before update';
        case TEMPLATE_REVISION_SOURCES.PRE_RESTORE:
            return 'Before restore';
        default:
            return source || 'Revision';
    }
}

export function templateSnapshotPayload({ name, description, elements, files }) {
    const sanitized = sanitizeElementsForPersistence(elements || []);
    const fileArr = filesToArray(files);
    return {
        name: (name || '').trim(),
        description: (description || '').trim(),
        elements: sanitized,
        files: fileArr,
        elementCount: sanitized.length,
    };
}

export function parseTemplateSnapshotJson(snapshotJson) {
    let snapshot = { name: '', description: '', elements: [], files: [] };
    try {
        snapshot = JSON.parse(snapshotJson || '{}');
    } catch {
        // tolerate corrupt rows
    }
    const elements = sanitizeElementsForPersistence(snapshot.elements || []);
    const files = rehydrateMissingFiles(elements, snapshot.files || []);
    return {
        name: snapshot.name || '',
        description: snapshot.description || '',
        elements,
        files,
        elementCount: elements.length,
    };
}

export function deserializeTemplateRevision(row) {
    const snap = parseTemplateSnapshotJson(row.snapshot_json);
    return {
        id: row._key,
        templateId: row.template_id,
        source: row.source || TEMPLATE_REVISION_SOURCES.UPDATE,
        label: row.label || '',
        createdAt: Number(row.created_at) || 0,
        createdBy: row.created_by || '',
        elementCount: Number(row.element_count) || snap.elementCount,
        name: snap.name,
        description: snap.description,
        elements: snap.elements,
        files: snap.files,
    };
}

async function pruneTemplateRevisions(templateId) {
    const rows = await kv.query(COLLECTIONS.templateRevisions, {
        query: JSON.stringify({ template_id: templateId }),
        sort: 'created_at:-1',
    });
    const all = rows || [];
    const stale = all.slice(MAX_REVISIONS_PER_TEMPLATE);
    await Promise.all(stale.map((r) => kv.remove(COLLECTIONS.templateRevisions, r._key)));
}

/** Persist a template revision snapshot. */
export async function insertTemplateRevision(templateId, { name, description, elements, files, source, label }) {
    if (!templateId) return;
    const snap = templateSnapshotPayload({ name, description, elements, files });
    await kv.insert(COLLECTIONS.templateRevisions, {
        template_id: templateId,
        source: source || TEMPLATE_REVISION_SOURCES.UPDATE,
        label: label || '',
        element_count: snap.elementCount,
        created_by: getCurrentUser(),
        created_at: Date.now(),
        snapshot_json: JSON.stringify({
            name: snap.name,
            description: snap.description,
            elements: snap.elements,
            files: snap.files,
        }),
    });
    await pruneTemplateRevisions(templateId);
    debug(`template revision saved (${source}, ${snap.elementCount} elements)`);
}

/** Snapshot existing template before overwrite. */
export async function revisionBeforeTemplateUpdate(templateId, existing, source) {
    if (!existing) return;
    let elements = [];
    try {
        elements = JSON.parse(existing.elements_json || '[]');
    } catch {
        elements = [];
    }
    if (!elements.length) return;
    let files = [];
    try {
        files = JSON.parse(existing.files_json || '[]');
    } catch {
        files = [];
    }
    try {
        await insertTemplateRevision(templateId, {
            name: existing.name,
            description: existing.description,
            elements,
            files,
            source: source || TEMPLATE_REVISION_SOURCES.UPDATE,
        });
    } catch (e) {
        logWarn('Template revision before update failed', e);
    }
}

export async function listTemplateRevisions(templateId) {
    if (!templateId) return [];
    const rows = await kv.query(COLLECTIONS.templateRevisions, {
        query: JSON.stringify({ template_id: templateId }),
        sort: 'created_at:-1',
    });
    return (rows || []).map(deserializeTemplateRevision);
}

export async function deleteTemplateRevision(revisionId) {
    await kv.remove(COLLECTIONS.templateRevisions, revisionId);
}

export async function deleteAllTemplateRevisions(templateId) {
    const rows = await listTemplateRevisions(templateId);
    await Promise.all(rows.map((r) => deleteTemplateRevision(r.id)));
}
