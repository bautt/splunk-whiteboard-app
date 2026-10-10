// Splunk brand color palette — the single source of truth for brand colors
// used across the whiteboard editor (canvas background presets, quick shape
// recoloring, etc). Grouped to mirror the brand guide's Core / Secondary /
// Neutral swatch sheet.

export const BRAND_COLOR_GROUPS = [
    {
        id: 'core',
        label: 'Core',
        colors: [
            { id: 'pink', label: 'Pink', hex: '#ED0080' },
            { id: 'dark-orange', label: 'Dark Orange', hex: '#F05A22' },
            { id: 'orange', label: 'Orange', hex: '#F99D1C' },
        ],
    },
    {
        id: 'secondary',
        label: 'Secondary',
        colors: [
            { id: 'dark-pink', label: 'Dark Pink', hex: '#C2006B' },
            { id: 'blue', label: 'Blue', hex: '#0070F3' },
            { id: 'dark-blue', label: 'Dark Blue', hex: '#004393' },
            { id: 'purple', label: 'Purple', hex: '#980AEC' },
            { id: 'dark-purple', label: 'Dark Purple', hex: '#662D91' },
        ],
    },
    {
        id: 'neutral',
        label: 'Neutral',
        colors: [
            { id: 'gray-1', label: 'Gray 1', hex: '#F0F3F7' },
            { id: 'gray-2', label: 'Gray 2', hex: '#D5DCE5' },
            { id: 'gray-3', label: 'Gray 3', hex: '#969DAA' },
            { id: 'gray-4', label: 'Gray 4', hex: '#656C76' },
            { id: 'gray-5', label: 'Gray 5', hex: '#363C44' },
        ],
    },
];

/** Flat list of all 13 brand colors: [{ id, label, hex }]. */
export const BRAND_COLORS = BRAND_COLOR_GROUPS.flatMap((group) => group.colors);

function hexToRgb(hex) {
    const h = (hex || '').replace('#', '');
    if (h.length !== 6) return null;
    const n = parseInt(h, 16);
    if (Number.isNaN(n)) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }) {
    return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

/** Mix a brand color toward white — used for a shape's fill when its stroke is a brand color. */
export function lightenBrandColor(hex, amount = 0.82) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    const mix = (c) => c + (255 - c) * amount;
    return rgbToHex({ r: mix(rgb.r), g: mix(rgb.g), b: mix(rgb.b) });
}

function srgbChannelLuminance(c) {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return 1;
    return (
        0.2126 * srgbChannelLuminance(rgb.r) +
        0.7152 * srgbChannelLuminance(rgb.g) +
        0.0722 * srgbChannelLuminance(rgb.b)
    );
}

/** Whether a brand color reads best against a dark canvas theme (WCAG relative luminance). */
export function isDarkBrandColor(hex) {
    return relativeLuminance(hex) < 0.4;
}
