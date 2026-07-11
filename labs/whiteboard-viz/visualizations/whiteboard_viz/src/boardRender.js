/*
 * Read-only board render helpers for the Dashboard Studio extension.
 *
 * These reuse the MAIN app's data-only icon libraries (shared render strategy)
 * so a board persisted by whiteboard_app renders identically here. The heavier
 * shape-icon path (src/web/lib/shapeIcons.js) pulls in React + @splunk/react-icons
 * and is intentionally NOT used in the sandboxed viz bundle for v0.1.0 — shape-*
 * icons render only if their image data is embedded in the payload. Factoring a
 * single shared render module is the next step (needs a 10.4 test instance).
 */
import { DRP_ICONS } from '../../../../../src/web/lib/drpIcons';
import MARKETING_ICONS from '../../../../../src/web/lib/marketingIcons';
import BRAND_ICONS from '../../../../../src/web/lib/brandIcons';
import { iconToDataUrl, tintSvgDataUrl } from '../../../../../src/web/lib/tintSvg';

/** Old board file ids → current brand icon id (rehydration only). */
const LEGACY_BRAND_FILE_IDS = {
    'brand-splunk-wordmark': 'brand-splunk-transition-black',
};

function makeFile(id, dataURL, mimeType = 'image/svg+xml') {
    const now = Date.now();
    return { id, dataURL, mimeType, created: now, lastRetrieved: now };
}

function tintFromDataUrl(dataURL, color) {
    try {
        return tintSvgDataUrl(atob(dataURL.split(',')[1]), color);
    } catch {
        return dataURL;
    }
}

function extractEmbeddedPng(svg) {
    const m = svg?.match(/href="(data:image\/png;base64,[^"]+)"/i);
    return m?.[1] ?? null;
}

/** Parse a KV `elements_json` value into { elements, appState, files[] }. */
export function parseBoard(elementsJson) {
    let elements = [];
    let appState = {};
    let files = [];
    try {
        const parsed = JSON.parse(elementsJson || '{}');
        elements = Array.isArray(parsed.elements) ? parsed.elements : [];
        appState = parsed.appState || {};
        files = parsed.files || [];
    } catch {
        /* leave defaults */
    }
    if (!Array.isArray(files)) files = Object.values(files || {});
    return { elements, appState, files };
}

/**
 * Build an Excalidraw files map, rebuilding missing library icons (drp / mktg /
 * brand) from the shared icon data so exportToSvg can draw them.
 */
export function buildFilesMap(elements, files) {
    const byId = new Map((files || []).filter((f) => f?.id).map((f) => [f.id, f]));

    const needed = new Set(
        (elements || [])
            .filter((el) => el.type === 'image' && el.fileId && !el.isDeleted)
            .map((el) => el.fileId)
    );

    needed.forEach((fileId) => {
        if (byId.has(fileId)) return;

        const drp = fileId.match(/^drp-(.+)-([0-9a-fA-F]{6})$/);
        if (drp && DRP_ICONS[drp[1]]) {
            byId.set(fileId, makeFile(fileId, tintFromDataUrl(DRP_ICONS[drp[1]], `#${drp[2]}`)));
            return;
        }

        const mktg = fileId.match(/^(mktg-.+)-([0-9a-fA-F]{6})$/);
        if (mktg) {
            const icon = MARKETING_ICONS.find((i) => i.id === mktg[1]);
            if (icon?.svg) byId.set(fileId, makeFile(fileId, tintSvgDataUrl(icon.svg, `#${mktg[2]}`)));
            return;
        }

        const brand =
            BRAND_ICONS.find((i) => i.id === fileId) ||
            BRAND_ICONS.find((i) => i.id === LEGACY_BRAND_FILE_IDS[fileId]);
        if (brand?.svg) {
            const png = extractEmbeddedPng(brand.svg);
            byId.set(fileId, png ? makeFile(fileId, png, 'image/png') : makeFile(fileId, iconToDataUrl(brand)));
        }
    });

    const map = {};
    byId.forEach((v, k) => {
        map[k] = v;
    });
    return map;
}
