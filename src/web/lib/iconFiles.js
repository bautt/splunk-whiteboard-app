import { normalizeHexColor, parseColorInput } from './canvasAppearance';
import { iconToDataUrl, svgMarkupToDataUrl, tintSvgDataUrl } from './tintSvg';

/** Parse viewBox="0 0 W H" from library SVG wrapper markup. */
export function parseSvgViewBox(svg) {
    const vb = svg?.match(/viewBox="\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*"/i);
    if (vb) {
        return { width: Number(vb[1]), height: Number(vb[2]) };
    }
    const w = svg?.match(/\bwidth="([\d.]+)"/i);
    const h = svg?.match(/\bheight="([\d.]+)"/i);
    if (w && h) return { width: Number(w[1]), height: Number(h[1]) };
    return { width: 120, height: 120 };
}

/** Scale to fit inside maxDim while preserving aspect ratio. */
export function fitIconDimensions(natW, natH, maxDim = 120) {
    if (!natW || !natH) return { width: maxDim, height: maxDim };
    const scale = Math.min(maxDim / natW, maxDim / natH);
    return {
        width: Math.max(1, Math.round(natW * scale)),
        height: Math.max(1, Math.round(natH * scale)),
    };
}

function extractEmbeddedImageDataUrl(svg) {
    const m = svg?.match(/href="(data:image\/[^;]+;base64,[^"]+)"/i);
    return m?.[1] ?? null;
}

export function normalizeIconColor(color, fallback = '#000000') {
    const parsed = parseColorInput(color) || parseColorInput(normalizeHexColor(color));
    return parsed || fallback;
}

/** Six-char hex suffix (no #) for tintable icon file ids. */
export function colorToFileSuffix(color) {
    return normalizeIconColor(color).replace('#', '').toLowerCase();
}

/** Stable Excalidraw file id for a library icon insert. */
export function buildIconFileId(iconId, color, tintable = true) {
    if (tintable === false) return iconId;
    return `${iconId}-${colorToFileSuffix(color)}`;
}

/** Build tinted (or raw) data URL for a library icon insert. */
export function buildIconDataUrl({ svg, color, tintable = true }) {
    if (tintable === false) return svgMarkupToDataUrl(svg);
    return tintSvgDataUrl(svg, normalizeIconColor(color));
}

/**
 * Register or replace an image file in Excalidraw.
 * addFiles alone may skip when fileId already exists; merge via updateScene too.
 */
export function upsertSvgImageFile(api, fileId, dataURL, mimeType = 'image/svg+xml') {
    const now = Date.now();
    const existing = api.getFiles?.()?.[fileId];
    const file = {
        id: fileId,
        dataURL,
        mimeType,
        created: existing?.created ?? now,
        lastRetrieved: now,
    };
    api.addFiles([file]);
    if (api.updateScene) {
        api.updateScene({ files: { ...(api.getFiles?.() || {}), [fileId]: file } });
    }
    return file;
}

/** Convenience: file id + data URL (+ mime) from library icon payload. */
export function prepareIconFile({ id, svg, color, tintable = true }) {
    const fileId = buildIconFileId(id, color, tintable);
    if (tintable === false) {
        // PNG wrappers: register as image/png so Excalidraw applies dark-mode
        // counter-invert (SVG mime skips that and logos look inverted).
        const embedded = extractEmbeddedImageDataUrl(svg);
        if (embedded?.startsWith('data:image/png')) {
            return { fileId, dataURL: embedded, mimeType: 'image/png' };
        }
        return {
            fileId,
            dataURL: iconToDataUrl({ svg, tintable: false }),
            mimeType: 'image/svg+xml',
        };
    }
    return {
        fileId,
        dataURL: buildIconDataUrl({ svg, color, tintable }),
        mimeType: 'image/svg+xml',
    };
}
