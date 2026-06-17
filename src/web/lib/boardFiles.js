import { DRP_ICONS } from './drpIcons';
import { MARKETING_ICONS } from './marketingIcons';

/** Normalize Excalidraw getFiles() map → array for KV storage. */
export function filesToArray(files) {
    if (!files) return [];
    if (Array.isArray(files)) return files;
    return Object.values(files);
}

/** Convert stored file array → Excalidraw initialData files map. */
export function filesToMap(files) {
    const arr = filesToArray(files);
    return Object.fromEntries(arr.filter((f) => f?.id).map((f) => [f.id, f]));
}

function tintSvgDataUrl(dataURL, color) {
    try {
        const svgB64 = dataURL.split(',')[1];
        const svgText = atob(svgB64);
        const tinted = svgText
            .replace(/^(<svg\b[^>]*)(>)/i, (_, tag, close) => `${tag} fill="${color}"${close}`)
            .replace(/fill="currentColor"/g, `fill="${color}"`)
            .replace(/stroke="currentColor"/g, `stroke="${color}"`);
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(tinted)));
    } catch {
        return dataURL;
    }
}

function tintSvgString(svg, color) {
    const tinted = svg.replace(
        /^(<svg\b[^>]*)(>)/i,
        (_, tag, close) => `${tag} fill="${color}"${close}`
    );
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(tinted)));
}

function makeFile(id, dataURL) {
    const now = Date.now();
    return {
        id,
        dataURL,
        mimeType: 'image/svg+xml',
        created: now,
        lastRetrieved: now,
    };
}

/** Rebuild missing image files from known DRP / marketing icon libraries. */
export function rehydrateMissingFiles(elements, files) {
    const arr = filesToArray(files);
    const byId = new Map(arr.map((f) => [f.id, f]));

    const needed = new Set(
        (elements || [])
            .filter((el) => el.type === 'image' && el.fileId && !el.isDeleted)
            .map((el) => el.fileId)
    );

    needed.forEach((fileId) => {
        if (byId.has(fileId)) return;

        // drp-Key-RRGGBB
        const drpMatch = fileId.match(/^drp-(.+)-([0-9a-fA-F]{6})$/);
        if (drpMatch && DRP_ICONS[drpMatch[1]]) {
            const color = `#${drpMatch[2]}`;
            byId.set(fileId, makeFile(fileId, tintSvgDataUrl(DRP_ICONS[drpMatch[1]], color)));
            return;
        }

        // mktg-Name-RRGGBB (marketing ids contain dashes)
        const mktgMatch = fileId.match(/^(mktg-.+)-([0-9a-fA-F]{6})$/);
        if (mktgMatch) {
            const iconId = mktgMatch[1];
            const color = `#${mktgMatch[2]}`;
            const icon = MARKETING_ICONS.find((i) => i.id === iconId);
            if (icon?.svg) {
                byId.set(fileId, makeFile(fileId, tintSvgString(icon.svg, color)));
            }
        }
    });

    return [...byId.values()];
}
