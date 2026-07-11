import { useDataSources, useTheme } from '@splunk/dashboard-studio-extension/react';
import Paragraph from '@splunk/react-ui/Paragraph';
import WaitSpinner from '@splunk/react-ui/WaitSpinner';
import { SplunkThemeProvider } from '@splunk/themes';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { exportToSvg } from '@excalidraw/excalidraw';
import { parseBoard, buildFilesMap } from './boardRender';
import './visualization.css';

// Pull the elements_json value out of the primary dataSource's first row.
// The dataSource is expected to be a kvstore lookup, e.g.
//   | inputlookup whiteboards where _key="<board id>"
function pickElementsJson(data) {
    if (!data) return null;
    const fields = (data.fields || []).map((f) => f.name || f);
    const idx = fields.indexOf('elements_json');
    if (idx === -1) return null;
    if (data.rows && data.rows.length > 0) return data.rows[0]?.[idx] ?? null;
    if (data.columns && data.columns.length > 0) return data.columns[idx]?.[0] ?? null;
    return null;
}

function Centered({ children }) {
    return (
        <div className="viz-container viz-container--empty">
            <div className="viz-message">{children}</div>
        </div>
    );
}

function BoardView({ elementsJson, colorScheme }) {
    const hostRef = useRef(null);
    const [status, setStatus] = useState('rendering');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { elements, appState, files } = parseBoard(elementsJson);
                if (!elements.length) {
                    if (!cancelled) setStatus('empty');
                    return;
                }
                const filesMap = buildFilesMap(elements, files);
                const svg = await exportToSvg({
                    elements,
                    files: filesMap,
                    appState: {
                        ...appState,
                        exportBackground: true,
                        exportWithDarkMode: colorScheme === 'dark',
                        viewBackgroundColor:
                            appState?.viewBackgroundColor ||
                            (colorScheme === 'dark' ? '#1a1c20' : '#ffffff'),
                    },
                });
                svg.setAttribute('width', '100%');
                svg.setAttribute('height', '100%');
                svg.style.width = '100%';
                svg.style.height = '100%';
                svg.style.display = 'block';
                if (!cancelled && hostRef.current) {
                    hostRef.current.replaceChildren(svg);
                    setStatus('ok');
                }
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('[whiteboard_viz] render failed', err);
                if (!cancelled) setStatus('error');
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [elementsJson, colorScheme]);

    return (
        <div className="viz-container">
            {status === 'rendering' && (
                <div className="viz-overlay">
                    <WaitSpinner size="medium" />
                </div>
            )}
            {status === 'empty' && (
                <Centered>
                    <Paragraph>This board has no elements to display.</Paragraph>
                </Centered>
            )}
            {status === 'error' && (
                <Centered>
                    <Paragraph>Could not render this board.</Paragraph>
                </Centered>
            )}
            <div ref={hostRef} className="viz-board" />
        </div>
    );
}

function Visualization() {
    const { dataSources, loading } = useDataSources();
    const { theme } = useTheme();
    const data = dataSources?.primary?.data || null;
    const elementsJson = useMemo(() => pickElementsJson(data), [data]);

    if (loading) {
        return (
            <div className="viz-container viz-container--empty">
                <WaitSpinner size="large" />
            </div>
        );
    }
    if (!elementsJson) {
        return (
            <Centered>
                <Paragraph>
                    No board data. Point this panel at a kvstore lookup returning an
                    <code> elements_json</code> field (e.g. <code>| inputlookup whiteboards</code>).
                </Paragraph>
            </Centered>
        );
    }
    return <BoardView elementsJson={elementsJson} colorScheme={theme} />;
}

function App() {
    const { theme } = useTheme();
    return (
        <SplunkThemeProvider family="enterprise" colorScheme={theme} density="comfortable">
            <Visualization />
        </SplunkThemeProvider>
    );
}

const rootElement = document.getElementById('root') || document.body;
createRoot(rootElement).render(<App />);
