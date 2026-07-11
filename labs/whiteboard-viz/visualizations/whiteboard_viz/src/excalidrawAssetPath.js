// Must run BEFORE @excalidraw/excalidraw initializes (import this first).
// Excalidraw otherwise defaults its asset path to https://unpkg.com/... and
// fetches its fonts from that CDN at runtime — which fails offline / in Splunk
// Cloud (CORS + no external egress). We self-host the woff2 files next to
// visualization.js (staged into appserver/static/visualizations/<viz>/) and
// point Excalidraw there. It appends "excalidraw-assets/<font>.woff2".
//
// We can't rely on import.meta.url here: esbuild wraps this module and replaces
// import.meta with an empty object. Instead we locate this bundle's own URL from
// the Performance resource timeline (it has already been fetched by the time
// this runs), falling back to document.currentScript.
const SELF_MARKER = 'visualizations/whiteboard_viz/visualization.js';

function findSelfUrl() {
    try {
        const entries = performance.getEntriesByType('resource') || [];
        for (const e of entries) {
            if (e && typeof e.name === 'string' && e.name.indexOf(SELF_MARKER) !== -1) {
                return e.name;
            }
        }
    } catch {
        /* performance API unavailable */
    }
    try {
        if (document.currentScript && document.currentScript.src) {
            return document.currentScript.src;
        }
    } catch {
        /* no currentScript (module context) */
    }
    return null;
}

try {
    if (typeof window !== 'undefined' && !window.EXCALIDRAW_ASSET_PATH) {
        const selfUrl = findSelfUrl();
        if (selfUrl) {
            // Directory that contains visualization.js; Excalidraw appends
            // "excalidraw-assets/…", so the fonts must live in that subfolder.
            window.EXCALIDRAW_ASSET_PATH = new URL('./', selfUrl).href;
        }
    }
} catch {
    /* leave Excalidraw's default if anything goes wrong */
}
