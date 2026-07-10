import { filesToArray, rehydrateMissingFiles } from './boardFiles';
import { sanitizeElementsForPersistence } from './build';

export const BUNDLE_FORMAT = 'whiteboard-bundle';
export const BUNDLE_FORMAT_VERSION = 1;
/** Wrapper for exporting many boards in a single file. */
export const COLLECTION_FORMAT = 'whiteboard-bundle-collection';

/** App-native board JSON for export / re-import (not Dashboard Studio). */
export function buildBoardBundle({ name, elements, appState, files, appVersion }) {
    const sanitized = sanitizeElementsForPersistence(elements || []);
    return {
        format: BUNDLE_FORMAT,
        formatVersion: BUNDLE_FORMAT_VERSION,
        whiteboardApp: appVersion || 'unknown',
        exportedAt: new Date().toISOString(),
        name: name || 'Untitled',
        board: {
            elements: sanitized,
            appState: appState || {},
            files: filesToArray(files),
        },
    };
}

/** Bundle a set of boards into one export file. */
export function buildBoardCollection(boards, appVersion) {
    return {
        format: COLLECTION_FORMAT,
        formatVersion: BUNDLE_FORMAT_VERSION,
        whiteboardApp: appVersion || 'unknown',
        exportedAt: new Date().toISOString(),
        boards: (boards || []).map((b) =>
            buildBoardBundle({
                name: b.name,
                elements: b.elements,
                appState: b.appState,
                files: b.files,
                appVersion,
            })
        ),
    };
}

/** Normalize a parsed bundle/plain object into { name, elements, appState, files }. */
function parseBoardBundleData(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid board file');
    }

    let board = data;
    if (data.format === BUNDLE_FORMAT && data.board) {
        board = data.board;
    } else if (Array.isArray(data.elements)) {
        board = data;
    } else {
        throw new Error('Unrecognized board format — use a Whiteboard App export (.json)');
    }

    const elements = sanitizeElementsForPersistence(board.elements || []);
    const files = rehydrateMissingFiles(elements, filesToArray(board.files));

    return {
        name: data.name || null,
        elements,
        appState: board.appState || {},
        files,
    };
}

/**
 * Parse exported board JSON. Accepts the app bundle wrapper or a plain
 * { elements, appState?, files? } object (Excalidraw-style).
 */
export function parseBoardBundle(text) {
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new Error('Invalid JSON file');
    }
    return parseBoardBundleData(data);
}

/**
 * Parse an exported file that may hold a single board or a collection of
 * boards. Always returns an array of { name, elements, appState, files }.
 */
export function parseBoardImport(text) {
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new Error('Invalid JSON file');
    }
    if (data && data.format === COLLECTION_FORMAT && Array.isArray(data.boards)) {
        if (!data.boards.length) throw new Error('This export contains no boards');
        return data.boards.map(parseBoardBundleData);
    }
    return [parseBoardBundleData(data)];
}
