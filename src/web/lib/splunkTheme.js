// Detects Splunk Web's preferred colour scheme so Excalidraw matches it.

export function detectSplunkColorScheme() {
    try {
        const body = document.body;
        if (body?.classList?.contains('dark')) return 'dark';
        if (body?.dataset?.theme === 'dark') return 'dark';
        const html = document.documentElement;
        if (html?.dataset?.theme === 'dark') return 'dark';
        if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch {
        // ignore — fall back to light
    }
    return 'light';
}

// Splunk semantic colours for sticky-note palette
export const STICKY_COLORS = {
    alert: '#DC4E41',
    warning: '#F1813F',
    healthy: '#53A051',
    info: '#1E93C6',
};
