import { DRP_ICONS } from './drpIcons';
import MARKETING_ICONS from './marketingIcons';
import BRAND_ICONS from './brandIcons';
import { getShapeSvgMarkup } from './shapeIcons';
import { iconToDataUrl, svgMarkupToDataUrl, tintSvgDataUrl } from './tintSvg';

/** Old board file ids → current brand icon id (rehydration only). */
const LEGACY_BRAND_FILE_IDS = {
    'brand-splunk-wordmark': 'brand-splunk-transition-black',
};

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

function tintSvgDataUrlFromDataUrl(dataURL, color) {
    try {
        const svgB64 = dataURL.split(',')[1];
        const svgText = atob(svgB64);
        return tintSvgDataUrl(svgText, color);
    } catch {
        return dataURL;
    }
}

function tintSvgString(svg, color) {
    return tintSvgDataUrl(svg, color);
}

function extractEmbeddedPngDataUrl(svg) {
    const m = svg?.match(/href="(data:image\/png;base64,[^"]+)"/i);
    return m?.[1] ?? null;
}

function makeFile(id, dataURL, mimeType = 'image/svg+xml') {
    const now = Date.now();
    return {
        id,
        dataURL,
        mimeType,
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

        // shape-uf-RRGGBB (Splunk react-icon SVG inserts)
        const shapeMatch = fileId.match(/^shape-([^-]+)-([0-9a-fA-F]{6})$/);
        if (shapeMatch) {
            const svg = getShapeSvgMarkup(shapeMatch[1]);
            if (svg) {
                const color = `#${shapeMatch[2].toLowerCase()}`;
                byId.set(fileId, makeFile(fileId, tintSvgString(svg, color)));
            }
            return;
        }

        // drp-Key-RRGGBB
        const drpMatch = fileId.match(/^drp-(.+)-([0-9a-fA-F]{6})$/);
        if (drpMatch && DRP_ICONS[drpMatch[1]]) {
            const color = `#${drpMatch[2]}`;
            byId.set(fileId, makeFile(fileId, tintSvgDataUrlFromDataUrl(DRP_ICONS[drpMatch[1]], color)));
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
            return;
        }

        const brandIcon = BRAND_ICONS.find((i) => i.id === fileId)
            || BRAND_ICONS.find((i) => i.id === LEGACY_BRAND_FILE_IDS[fileId]);
        if (brandIcon?.svg) {
            const png = extractEmbeddedPngDataUrl(brandIcon.svg);
            if (png) {
                byId.set(fileId, makeFile(fileId, png, 'image/png'));
            } else {
                byId.set(fileId, makeFile(fileId, iconToDataUrl(brandIcon)));
            }
        }
    });

    return [...byId.values()];
}
