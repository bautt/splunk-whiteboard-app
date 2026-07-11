import './excalidrawAssetPath'; // must precede the @excalidraw import
import { useDataSources, useTheme } from '@splunk/dashboard-studio-extension/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { exportToSvg, restoreElements } from '@excalidraw/excalidraw';
import { parseBoard, buildFilesMap } from './boardRender';
import './visualization.css';

// The extension runs in a sandboxed iframe where @splunk/themes tokens and the
// host page's CSS are unavailable, so this component deliberately avoids
// @splunk/react-ui / SplunkThemeProvider and uses plain inline-styled elements.

// Pull the elements_json value out of the primary dataSource's first row.
// DS delivers columnar data: { fields: [{name}], columns: [[...]] } (all strings).
function pickElementsJson(data) {
    if (!data) return null;
    const fields = (data.fields || []).map((f) => (f && f.name) || f);
    const idx = fields.indexOf('elements_json');
    if (idx === -1) return null;
    if (data.rows && data.rows.length > 0) return data.rows[0]?.[idx] ?? null;
    if (data.columns && data.columns.length > 0) return data.columns[idx]?.[0] ?? null;
    return null;
}

function Message({ dark, children, tone }) {
    const color = tone === 'error' ? '#d41f1f' : dark ? '#c3cbd4' : '#5c6773';
    return (
        <div className="viz-container viz-container--empty">
            <div className="viz-message" style={{ color }}>
                {children}
            </div>
        </div>
    );
}

function BoardView({ elementsJson, dark }) {
    const hostRef = useRef(null);
    const [state, setState] = useState({ status: 'rendering', error: '' });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { elements: raw, appState, files } = parseBoard(elementsJson);
                // Fill in defaults / normalize so hand-authored or older boards
                // render correctly (Excalidraw's renderer skips under-specified elements).
                const elements = restoreElements(raw, null);
                if (!elements.length) {
                    if (!cancelled) setState({ status: 'empty', error: '' });
                    return;
                }
                const filesMap = buildFilesMap(elements, files);
                const svg = await exportToSvg({
                    elements,
                    files: filesMap,
                    appState: {
                        ...appState,
                        exportBackground: true,
                        exportWithDarkMode: dark,
                        viewBackgroundColor:
                            appState?.viewBackgroundColor || (dark ? '#1a1c20' : '#ffffff'),
                    },
                });
                svg.setAttribute('width', '100%');
                svg.setAttribute('height', '100%');
                svg.style.width = '100%';
                svg.style.height = '100%';
                svg.style.display = 'block';
                if (!cancelled && hostRef.current) {
                    hostRef.current.replaceChildren(svg);
                    setState({ status: 'ok', error: '' });
                }
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('[whiteboard_viz] render failed', err);
                if (!cancelled) {
                    setState({ status: 'error', error: (err && err.message) || String(err) });
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [elementsJson, dark]);

    return (
        <div className="viz-container">
            {state.status === 'rendering' && <Message dark={dark}>Rendering board…</Message>}
            {state.status === 'empty' && (
                <Message dark={dark}>This board has no elements to display.</Message>
            )}
            {state.status === 'error' && (
                <Message dark={dark} tone="error">
                    Could not render this board: {state.error}
                </Message>
            )}
            <div ref={hostRef} className="viz-board" />
        </div>
    );
}

function Visualization() {
    const { dataSources, loading } = useDataSources();
    const { theme } = useTheme();
    const dark = theme === 'dark';
    const data = dataSources?.primary?.data || null;
    const elementsJson = useMemo(() => pickElementsJson(data), [data]);

    if (loading) return <Message dark={dark}>Loading data…</Message>;
    if (!elementsJson) {
        return (
            <Message dark={dark}>
                No board data. Point this panel at a kvstore lookup returning an{' '}
                <code>elements_json</code> field (e.g. <code>| inputlookup whiteboards</code>).
            </Message>
        );
    }
    return <BoardView elementsJson={elementsJson} dark={dark} />;
}

function App() {
    try {
        return <Visualization />;
    } catch (err) {
        return (
            <div className="viz-container viz-container--empty">
                <div className="viz-message" style={{ color: '#d41f1f' }}>
                    Visualization crashed: {(err && err.message) || String(err)}
                </div>
            </div>
        );
    }
}

const rootElement = document.getElementById('root') || document.body;
createRoot(rootElement).render(<App />);
