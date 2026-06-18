/** Canvas theme + background — mirrors Excalidraw appState fields. */

export const EXCALIDRAW_THEME = {
    LIGHT: 'light',
    DARK: 'dark',
};

/** Excalidraw default stored canvas background (COLOR_PALETTE.white). */
export const DEFAULT_LIGHT_BG = '#ffffff';
/** Default display color for dark-theme boards (charcoal). */
export const DEFAULT_DARK_DISPLAY_BG = '#1e1e1e';

export const BACKGROUND_PRESETS = [
    { id: 'white', label: 'White', color: '#ffffff', themes: ['light'] },
    { id: 'gray', label: 'Light gray', color: '#f2f4f5', themes: ['light'] },
    { id: 'warm', label: 'Warm', color: '#faf8f5', themes: ['light'] },
    { id: 'charcoal', label: 'Charcoal', color: '#1e1e1e', themes: ['dark'] },
    { id: 'slate', label: 'Slate', color: '#2d333b', themes: ['dark'] },
    { id: 'navy', label: 'Navy', color: '#0d1117', themes: ['dark'] },
];

export function normalizeHexColor(hex) {
    if (!hex || typeof hex !== 'string') return '';
    const h = hex.trim().toLowerCase();
    if (h.length === 4 && h.startsWith('#')) {
        return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
    }
    return h;
}

/** Normalize persisted theme; migrates legacy themeMode (incl. auto → light). */
export function normalizeTheme(appState = {}) {
    const { theme, themeMode } = appState;
    if (theme === EXCALIDRAW_THEME.DARK || theme === EXCALIDRAW_THEME.LIGHT) return theme;
    if (themeMode === 'dark') return EXCALIDRAW_THEME.DARK;
    if (themeMode === 'light') return EXCALIDRAW_THEME.LIGHT;
    return EXCALIDRAW_THEME.LIGHT;
}

function hexToRgb(hex) {
    const h = normalizeHexColor(hex).replace('#', '');
    if (h.length !== 6) return null;
    const n = parseInt(h, 16);
    if (Number.isNaN(n)) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }) {
    return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

function isValidRgb({ r, g, b }) {
    return [r, g, b].every((c) => Number.isFinite(c) && c >= 0 && c <= 255);
}

/**
 * Parse user-entered color: #hex, hex, rgb(...), rgba(...), or comma/space-separated RGB.
 * Returns normalized #rrggbb or null.
 */
export function parseColorInput(input) {
    if (!input || typeof input !== 'string') return null;
    const s = input.trim().toLowerCase();
    if (!s) return null;

    const rgbFn = s.match(
        /^rgba?\(\s*(\d{1,3})\s*[,/\s]+\s*(\d{1,3})\s*[,/\s]+\s*(\d{1,3})/
    );
    if (rgbFn) {
        const rgb = { r: Number(rgbFn[1]), g: Number(rgbFn[2]), b: Number(rgbFn[3]) };
        return isValidRgb(rgb) ? rgbToHex(rgb) : null;
    }

    const parts = s.split(/[\s,]+/).filter(Boolean);
    if (parts.length === 3 && parts.every((p) => /^\d{1,3}$/.test(p))) {
        const rgb = { r: Number(parts[0]), g: Number(parts[1]), b: Number(parts[2]) };
        return isValidRgb(rgb) ? rgbToHex(rgb) : null;
    }

    const hex = s.startsWith('#') ? s : `#${s}`;
    const normalized = normalizeHexColor(hex);
    return hexToRgb(normalized) ? normalized : null;
}

/** Excalidraw dark-theme canvas CSS filter (see excalidraw theme styles). */
const DARK_CANVAS_FILTER = 'invert(93%) hue-rotate(180deg)';

let _filterCanvasCtx;

function filterCanvasCtx() {
    if (typeof document === 'undefined') return null;
    if (!_filterCanvasCtx) {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        _filterCanvasCtx = canvas.getContext('2d', { willReadFrequently: true });
    }
    return _filterCanvasCtx;
}

function clampByte(value) {
    return Math.max(0, Math.min(255, value));
}

function colorDistance(a, b) {
    return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

/** Apply Excalidraw's dark-mode canvas filter to a stored background color. */
export function applyDarkCanvasFilter(hex) {
    const normalized = normalizeHexColor(hex);
    const rgb = hexToRgb(normalized);
    if (!rgb) return normalized;

    const ctx = filterCanvasCtx();
    if (!ctx) return invertRgbHex(normalized);

    ctx.clearRect(0, 0, 1, 1);
    ctx.filter = DARK_CANVAS_FILTER;
    ctx.fillStyle = normalized;
    ctx.fillRect(0, 0, 1, 1);
    ctx.filter = 'none';

    const data = ctx.getImageData(0, 0, 1, 1).data;
    return rgbToHex({ r: data[0], g: data[1], b: data[2] });
}

/** Find stored color whose filtered result matches the desired display color. */
export function inverseDarkCanvasFilter(displayHex) {
    const display = normalizeHexColor(displayHex);
    const target = hexToRgb(display);
    if (!target) return display;

    const ctx = filterCanvasCtx();
    if (!ctx) return invertRgbHex(display);

    const seeds = [invertRgbHex(display), display, '#ffffff', '#000000'];
    let bestHex = seeds[0];
    let bestErr = Infinity;

    for (const seed of seeds) {
        const start = hexToRgb(seed);
        if (!start) continue;

        let { r, g, b } = start;
        for (let iter = 0; iter < 40; iter += 1) {
            const candidate = rgbToHex({ r, g, b });
            const current = hexToRgb(applyDarkCanvasFilter(candidate));
            if (!current) break;

            const err = colorDistance(current, target);
            if (err < bestErr) {
                bestErr = err;
                bestHex = candidate;
            }
            if (err <= 2) return candidate;

            r = clampByte(r + target.r - current.r);
            g = clampByte(g + target.g - current.g);
            b = clampByte(b + target.b - current.b);
        }
    }

    return bestHex;
}

/**
 * RGB invert — legacy approximation; prefer applyDarkCanvasFilter / inverseDarkCanvasFilter.
 */
export function invertRgbHex(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return normalizeHexColor(hex);
    return rgbToHex({ r: 255 - rgb.r, g: 255 - rgb.g, b: 255 - rgb.b });
}

/** What the user sees on screen from Excalidraw's stored viewBackgroundColor. */
export function displayBackgroundColor(storedColor, theme) {
    const stored = normalizeHexColor(storedColor);
    if (!stored) return defaultDisplayBackgroundForTheme(theme);
    return theme === EXCALIDRAW_THEME.DARK ? applyDarkCanvasFilter(stored) : stored;
}

/** Stored viewBackgroundColor for Excalidraw from a user-facing display color. */
export function storedBackgroundColor(displayColor, theme) {
    const display = normalizeHexColor(displayColor);
    if (!display) return defaultStoredBackgroundForTheme(theme);
    return theme === EXCALIDRAW_THEME.DARK ? inverseDarkCanvasFilter(display) : display;
}

/** Default display color shown on canvas for a theme. */
export function defaultDisplayBackgroundForTheme(theme) {
    return theme === EXCALIDRAW_THEME.DARK ? DEFAULT_DARK_DISPLAY_BG : DEFAULT_LIGHT_BG;
}

/** Default stored value Excalidraw should persist for a theme. */
export function defaultStoredBackgroundForTheme(theme) {
    return storedBackgroundColor(defaultDisplayBackgroundForTheme(theme), theme);
}

/** @deprecated use defaultStoredBackgroundForTheme */
export function defaultBackgroundForTheme(theme) {
    return defaultStoredBackgroundForTheme(theme);
}

export function presetsForTheme(theme) {
    const bucket = theme === EXCALIDRAW_THEME.DARK ? 'dark' : 'light';
    return BACKGROUND_PRESETS.filter((p) => p.themes.includes(bucket));
}

export function backgroundMatchesTheme(displayColor, theme) {
    const display = normalizeHexColor(displayColor);
    return presetsForTheme(theme).some((p) => normalizeHexColor(p.color) === display);
}

/**
 * Panel / save helpers: patch may carry displayBackgroundColor (UI) or
 * viewBackgroundColor (already stored, e.g. from Excalidraw onChange).
 */
export function resolveAppearancePatch(patch, current = {}) {
    if (!patch || Object.keys(patch).length === 0) return patch;

    const nextTheme = patch.theme != null ? normalizeTheme({ ...current, ...patch }) : normalizeTheme(current);

    if (patch.displayBackgroundColor != null) {
        return {
            theme: nextTheme,
            viewBackgroundColor: storedBackgroundColor(patch.displayBackgroundColor, nextTheme),
        };
    }

    if (patch.viewBackgroundColor != null && patch.theme === undefined) {
        return { theme: nextTheme, viewBackgroundColor: normalizeHexColor(patch.viewBackgroundColor) };
    }

    if (patch.theme != null) {
        const next = { theme: nextTheme };
        if (patch.viewBackgroundColor !== undefined) {
            next.viewBackgroundColor = normalizeHexColor(patch.viewBackgroundColor);
        } else {
            // Theme toggle: apply white (light) or charcoal (dark) automatically.
            next.viewBackgroundColor = defaultStoredBackgroundForTheme(nextTheme);
        }
        return next;
    }

    return { ...patch };
}

/** Apply appearance via Excalidraw updateScene (theme + viewBackgroundColor). */
export function applyCanvasAppearance(excalidrawAPI, patch, current = {}) {
    if (!excalidrawAPI || !patch || Object.keys(patch).length === 0) return;
    const resolved = resolveAppearancePatch(patch, current);
    const elements = excalidrawAPI.getSceneElements();
    excalidrawAPI.updateScene({
        elements: [...elements],
        appState: resolved,
    });
    if (typeof excalidrawAPI.refresh === 'function') {
        excalidrawAPI.refresh();
    }
}

/** Board appState → Excalidraw-ready appearance fields (stored values). */
export function boardAppearanceState(boardAppState = {}) {
    const theme = normalizeTheme(boardAppState);
    return {
        theme,
        viewBackgroundColor:
            boardAppState.viewBackgroundColor || defaultStoredBackgroundForTheme(theme),
    };
}
