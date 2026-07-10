// Resolves the theme Splunk Web is actually using so our React UI matches the
// surrounding page exactly. Splunk's theme is a user preference stored in
// Splunk — it is independent of the OS `prefers-color-scheme`, so we must read
// it from Splunk's own theme API rather than guessing from the browser/OS.
import { getUserTheme, getThemeOptions } from '@splunk/splunk-utils/themes';

// Props expected by <SplunkThemeProvider> when the theme API is unavailable.
const FALLBACK_THEME_OPTIONS = { family: 'enterprise', colorScheme: 'light', density: 'compact' };

/**
 * Resolve the SplunkThemeProvider props ({ family, colorScheme, density }) for
 * the current user's Splunk Web theme. Async because Splunk lazy-loads its
 * theme API script. Always resolves (never rejects) — falls back to light.
 */
export async function resolveSplunkThemeOptions() {
    try {
        const theme = await getUserTheme();
        const options = getThemeOptions(theme);
        return { ...FALLBACK_THEME_OPTIONS, ...options };
    } catch {
        return { ...FALLBACK_THEME_OPTIONS };
    }
}

// Splunk semantic colours for sticky-note palette
export const STICKY_COLORS = {
    alert: '#DC4E41',
    warning: '#F1813F',
    healthy: '#53A051',
    info: '#1E93C6',
};
