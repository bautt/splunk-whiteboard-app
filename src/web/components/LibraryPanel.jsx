import React, { useCallback, useEffect, useRef, useState } from 'react';
import Button from '@splunk/react-ui/Button';
import Heading from '@splunk/react-ui/Heading';
import { debug, logWarn, logError } from '../lib/log';

const BASE = 'https://libraries.excalidraw.com';
const CATALOG_URL = `${BASE}/libraries.json`;
const MAX_LIBRARY_BYTES = 5 * 1024 * 1024;

/** Normalize a library file regardless of v1/v2 format.
 *  Excalidraw's LibraryItem requires: id, status, elements, created (epoch ms).
 */
function parseLibFile(data) {
    const now = Date.now();
    // v2: { version: 2, libraryItems: [{id, name, elements, status, created}] }
    if (data.version === 2) {
        return (data.libraryItems || []).map((item) => ({
            id: item.id || String(Math.random()),
            name: item.name || 'Item',
            status: 'published',
            elements: item.elements || [],
            created: item.created || now,
        }));
    }
    // v1: { version: 1, library: [[...elements], [...elements]] }
    // Each entry is a flat array of elements (not an object).
    const libArray = data.library || data.libraryItems || [];
    return libArray.map((entry, i) => {
        // v1 entry is an array; v2 entry is an object — handle both
        const elements = Array.isArray(entry) ? entry : (entry.elements || []);
        return {
            id: `lib-v1-${now}-${i}`,
            name: Array.isArray(entry) ? `Item ${i + 1}` : (entry.name || `Item ${i + 1}`),
            status: 'published',
            elements,
            created: now + i,
        };
    });
}

const CONSENT_KEY = 'wb_libraries_consent';

export default function LibraryPanel({ excalidrawAPI }) {
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [importing, setImporting] = useState({}); // id → 'loading'|'done'|'error'
    // Opt-in: this panel makes requests to a third-party site (libraries.excalidraw.com),
    // which exposes the user's IP. We do not contact it until the user explicitly enables it.
    const [enabled, setEnabled] = useState(() => {
        try { return localStorage.getItem(CONSENT_KEY) === '1'; } catch (e) { return false; }
    });
    const abortRef = useRef(null);

    useEffect(() => {
        if (!enabled) return undefined;
        setLoading(true);
        setError(null);
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        fetch(CATALOG_URL, { signal: ctrl.signal })
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data) => {
                // API returns a plain array
                const libs = Array.isArray(data) ? data : data.libraries || [];
                setCatalog(libs);
                setLoading(false);
            })
            .catch((err) => {
                if (err.name !== 'AbortError') {
                    setError(err.message);
                    setLoading(false);
                }
            });
        return () => ctrl.abort();
    }, [enabled]);

    const enable = () => {
        try { localStorage.setItem(CONSENT_KEY, '1'); } catch (e) { /* ignore */ }
        setEnabled(true);
    };
    const disable = () => {
        try { localStorage.removeItem(CONSENT_KEY); } catch (e) { /* ignore */ }
        if (abortRef.current) abortRef.current.abort();
        setEnabled(false);
        setCatalog([]);
        setError(null);
    };

    const handleImport = useCallback(
        async (lib) => {
            if (!excalidrawAPI) {
                logWarn('LibraryPanel: excalidrawAPI not ready');
                return;
            }
            const url = `${BASE}/libraries/${lib.source}`;
            setImporting((p) => ({ ...p, [lib.id]: 'loading' }));
            try {
                const resp = await fetch(url);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const buf = await resp.arrayBuffer();
                if (buf.byteLength > MAX_LIBRARY_BYTES) {
                    throw new Error(`Library exceeds ${MAX_LIBRARY_BYTES / (1024 * 1024)} MB limit`);
                }
                const data = JSON.parse(new TextDecoder().decode(buf));
                debug('Library raw data version:', data.version, 'keys:', Object.keys(data));
                const items = parseLibFile(data);
                debug('Parsed library items:', items.length,
                    items[0] ? `first: "${items[0].name}" elems=${items[0].elements.length}` : '');
                if (!items.length) throw new Error('Library contains no items');

                // Pass items as a function so Excalidraw merges with existing library
                await excalidrawAPI.updateLibrary({
                    libraryItems: (existing) => [...existing, ...items],
                    openLibraryMenu: true,   // auto-open the library panel
                });
                debug('Library imported OK:', lib.name);
                setImporting((p) => ({ ...p, [lib.id]: 'done' }));
            } catch (e) {
                logError('Library import failed:', e);
                setImporting((p) => ({ ...p, [lib.id]: 'error' }));
            }
        },
        [excalidrawAPI]
    );

    const filtered = catalog.filter((lib) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            lib.name.toLowerCase().includes(q) ||
            (lib.description || '').toLowerCase().includes(q) ||
            (lib.authors || []).some((a) => a.name.toLowerCase().includes(q))
        );
    });

    if (!enabled) {
        return (
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Heading level={3}>Excalidraw Libraries</Heading>
                <div
                    style={{
                        padding: 12,
                        border: '1px solid var(--gray60, #c3cbd4)',
                        borderRadius: 8,
                        fontSize: 13,
                        lineHeight: 1.5,
                        background: 'var(--gray98, #fafbfc)',
                    }}
                >
                    <strong>Third-party content</strong>
                    <p style={{ margin: '6px 0 10px' }}>
                        This feature loads community shape libraries directly from{' '}
                        <a href="https://libraries.excalidraw.com" target="_blank" rel="noreferrer">
                            libraries.excalidraw.com
                        </a>
                        . Enabling it sends requests from your browser to that external
                        site, which will expose your IP address to a third party. No board
                        data ever leaves Splunk.
                    </p>
                    <Button appearance="primary" onClick={enable}>
                        Enable external libraries
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Heading level={3}>Excalidraw Libraries</Heading>
                <Button size="small" appearance="secondary" onClick={disable}>
                    Disable
                </Button>
            </div>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
                Browse {catalog.length} community libraries from{' '}
                <a href="https://libraries.excalidraw.com" target="_blank" rel="noreferrer">
                    libraries.excalidraw.com
                </a>
                . Imported items appear in the Excalidraw library panel (book icon in toolbar).
            </p>

            <input
                type="text"
                placeholder="Search libraries…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '6px 10px',
                    fontSize: 13,
                    border: '1px solid var(--gray60, #c3cbd4)',
                    borderRadius: 6,
                    outline: 'none',
                    background: 'var(--gray98, #fff)',
                    color: 'inherit',
                }}
            />

            {loading && (
                <div style={{ textAlign: 'center', padding: 24, opacity: 0.6, fontSize: 13 }}>
                    Loading catalog…
                </div>
            )}

            {error && (
                <div
                    style={{
                        padding: '8px 12px',
                        background: '#fef2f2',
                        border: '1px solid #fca5a5',
                        borderRadius: 6,
                        color: '#b91c1c',
                        fontSize: 12,
                    }}
                >
                    Could not load library catalog: {error}
                </div>
            )}

            {!loading && !error && (
                <div
                    style={{
                        fontSize: 11,
                        opacity: 0.6,
                        marginTop: -4,
                    }}
                >
                    {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                    {search && ` for "${search}"`}
                </div>
            )}

            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    paddingRight: 2,
                }}
            >
                {filtered.map((lib) => {
                    const state = importing[lib.id];
                    const previewURL = lib.preview
                        ? `${BASE}/libraries/${lib.preview}`
                        : null;
                    return (
                        <div
                            key={lib.id}
                            style={{
                                display: 'flex',
                                gap: 10,
                                padding: '8px 10px',
                                border: '1px solid var(--gray90, #e2e6ea)',
                                borderRadius: 8,
                                background: state === 'done'
                                    ? 'var(--green98, #f0fdf4)'
                                    : 'var(--gray99, #fafbfc)',
                                alignItems: 'flex-start',
                            }}
                        >
                            {/* Preview thumbnail */}
                            <div
                                style={{
                                    flexShrink: 0,
                                    width: 52,
                                    height: 52,
                                    border: '1px solid var(--gray85, #d1d9e0)',
                                    borderRadius: 6,
                                    overflow: 'hidden',
                                    background: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {previewURL ? (
                                    <img
                                        src={previewURL}
                                        alt={lib.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        loading="lazy"
                                    />
                                ) : (
                                    <span style={{ fontSize: 20 }}>📚</span>
                                )}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                    style={{
                                        fontWeight: 600,
                                        fontSize: 13,
                                        marginBottom: 2,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {lib.name}
                                </div>
                                {lib.description && (
                                    <div
                                        style={{
                                            fontSize: 11,
                                            opacity: 0.7,
                                            marginBottom: 4,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {lib.description}
                                    </div>
                                )}
                                {lib.authors?.length > 0 && (
                                    <div style={{ fontSize: 10, opacity: 0.5 }}>
                                        by {lib.authors.map((a) => a.name).join(', ')}
                                    </div>
                                )}
                            </div>

                            {/* Import button */}
                            <div style={{ flexShrink: 0, alignSelf: 'center' }}>
                                {state === 'done' ? (
                                    <span
                                        style={{
                                            fontSize: 18,
                                            color: '#16a34a',
                                            display: 'block',
                                            padding: '0 4px',
                                        }}
                                        title="Imported"
                                    >
                                        ✓
                                    </span>
                                ) : state === 'error' ? (
                                    <Button
                                        size="small"
                                        appearance="secondary"
                                        onClick={() => handleImport(lib)}
                                        title="Import failed — click to retry"
                                    >
                                        Retry
                                    </Button>
                                ) : (
                                    <Button
                                        size="small"
                                        appearance={state === 'loading' ? 'secondary' : 'primary'}
                                        disabled={state === 'loading' || !excalidrawAPI}
                                        onClick={() => handleImport(lib)}
                                    >
                                        {state === 'loading' ? '…' : 'Import'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
