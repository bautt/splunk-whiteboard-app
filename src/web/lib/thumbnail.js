// Renders a small PNG preview of a board from its persisted elements/appState/
// files, using Excalidraw's standalone exportToBlob (no mounted editor needed).

import { exportToBlob, restoreElements } from '@excalidraw/excalidraw';
import { filesToMap } from './boardFiles';

/** Longest edge of the generated preview image, in pixels. */
export const THUMBNAIL_MAX_DIM = 400;

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/** True when a board has at least one non-deleted element to preview. */
export function boardHasContent(elements) {
    return Array.isArray(elements) && elements.some((el) => el && !el.isDeleted);
}

/**
 * Generate a bounded PNG data URL preview for a board. Returns null for empty
 * boards. Best-effort — callers should tolerate a thrown error.
 */
export async function generateThumbnailDataUrl({ elements, appState, files }) {
    if (!boardHasContent(elements)) return null;
    const blob = await exportToBlob({
        elements: restoreElements(elements, null),
        appState: {
            ...(appState || {}),
            exportBackground: true,
            exportWithDarkMode: (appState || {}).theme === 'dark',
            viewBackgroundColor: (appState || {}).viewBackgroundColor,
        },
        files: filesToMap(files || []),
        mimeType: 'image/png',
        quality: 0.72,
        maxWidthOrHeight: THUMBNAIL_MAX_DIM,
    });
    return blobToDataUrl(blob);
}
