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

/**
 * RGB invert — approximates Excalidraw dark-mode canvas filter on background.
 * Dark theme stores inverted values; light theme is WYSIWYG.
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
    return theme === EXCALIDRAW_THEME.DARK ? invertRgbHex(stored) : stored;
}

/** Stored viewBackgroundColor for Excalidraw from a user-facing display color. */
export function storedBackgroundColor(displayColor, theme) {
    const display = normalizeHexColor(displayColor);
    if (!display) return defaultStoredBackgroundForTheme(theme);
    return theme === EXCALIDRAW_THEME.DARK ? invertRgbHex(display) : display;
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
