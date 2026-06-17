import { filesToArray } from './boardFiles';
import { sanitizeElementsForPersistence } from './build';

export const BUNDLE_FORMAT = 'whiteboard-bundle';
export const BUNDLE_FORMAT_VERSION = 1;

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

    return {
        name: data.name || null,
        elements,
        appState: board.appState || {},
        files: filesToArray(board.files),
    };
}
