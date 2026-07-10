// One-time migration: convert legacy user-saved templates into shared boards.
//
// The dedicated "template" concept was removed in favour of treating everything
// as a board (starter boards clone on open; any board can be duplicated). Any
// templates a user previously saved in the `whiteboard_templates` KV collection
// are migrated here into ordinary shared boards, then the source rows (and their
// revision history) are removed so the migration never runs twice.
//
// The KV collections are retained in collections.conf for this deprecation cycle
// so this code can still read pre-upgrade data; they can be dropped in a later
// release once installs have migrated.

import { kv, COLLECTIONS } from './kvstoreClient';
import { BOARD_SCOPE, BOARD_VISIBILITY } from './boardScope';
import { serializeBoardPayload } from './boardAccess';
import { sanitizeElementsForPersistence } from './build';
import { rehydrateMissingFiles } from './boardFiles';
import { getCurrentUser } from './currentUser';
import { logWarn } from './log';

const LEGACY_TEMPLATES = 'whiteboard_templates';

function parseTemplateRow(row) {
    let elements = [];
    try {
        elements = sanitizeElementsForPersistence(JSON.parse(row.elements_json || '[]'));
    } catch {
        elements = [];
    }
    let storedFiles = [];
    try {
        storedFiles = JSON.parse(row.files_json || '[]');
    } catch {
        storedFiles = [];
    }
    let appState = {};
    try {
        appState = JSON.parse(row.appstate_json || '{}') || {};
    } catch {
        appState = {};
    }
    return {
        elements,
        files: rehydrateMissingFiles(elements, storedFiles),
        appState,
    };
}

async function removeAllTemplateRevisions() {
    let rows = [];
    try {
        rows = await kv.list(COLLECTIONS.templateRevisions);
    } catch {
        return;
    }
    await Promise.all(
        (rows || []).map((r) =>
            kv.remove(COLLECTIONS.templateRevisions, r._key).catch(() => {})
        )
    );
}

/**
 * Migrate legacy templates to shared boards. Idempotent: once the source rows
 * are removed it becomes a no-op.
 *
 * @returns {Promise<number>} number of templates migrated
 */
export async function migrateTemplatesToBoards() {
    let rows;
    try {
        rows = await kv.list(LEGACY_TEMPLATES);
    } catch {
        // Collection missing/unreadable — nothing to migrate.
        return 0;
    }
    const templates = Array.isArray(rows) ? rows : [];
    if (!templates.length) return 0;

    let migrated = 0;
    for (const row of templates) {
        try {
            const { elements, files, appState } = parseTemplateRow(row);
            const doc = {
                name: (row.name || 'Template').trim() || 'Template',
                tags: 'from-template',
                owner: row.created_by || getCurrentUser(),
                visibility: BOARD_VISIBILITY.SHARED,
                updated_at: Date.now(),
                elements_json: serializeBoardPayload({ elements, appState, files }),
            };
            // eslint-disable-next-line no-await-in-loop
            await kv.insert(COLLECTIONS.boards, doc, BOARD_SCOPE.SHARED);
            // eslint-disable-next-line no-await-in-loop
            await kv.remove(LEGACY_TEMPLATES, row._key);
            migrated += 1;
        } catch (e) {
            logWarn('Template migration failed for one template', e);
        }
    }

    if (migrated) {
        await removeAllTemplateRevisions();
    }
    return migrated;
}
