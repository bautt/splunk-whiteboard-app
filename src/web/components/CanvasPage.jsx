import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Excalidraw, exportToBlob, restoreElements } from '@excalidraw/excalidraw';

import Button from '@splunk/react-ui/Button';
import TabBar from '@splunk/react-ui/TabBar';
import Text from '@splunk/react-ui/Text';
import Message from '@splunk/react-ui/Message';

import TemplatePanel from './TemplatePanel';
import ShapesPanel from './ShapesPanel';
import HistoryPanel from './HistoryPanel';
import ExportPanel from './ExportPanel';
import LibraryPanel from './LibraryPanel';
import PresentationMode from './PresentationMode';
import PanelErrorBoundary from './PanelErrorBoundary';

import { useBoard, useBoardMutations, useAutoSave } from '../hooks/useKVStore';
import { useVersions } from '../hooks/useVersions';
import { detectSplunkColorScheme } from '../lib/splunkTheme';
import { nanoid } from '../lib/nanoid';

const TABS = [
    { label: 'Shapes', value: 'shapes' },
    { label: 'Templates', value: 'templates' },
    { label: 'Libraries', value: 'libraries' },
    { label: 'History', value: 'history' },
    { label: 'Export', value: 'export' },
];

const SIDEBAR_MIN = 240;
const SIDEBAR_MAX = 600;
const SIDEBAR_DEFAULT = 320;
const SIDEBAR_KEY = 'wb_sidebar_width';

/** Drag-to-resize sidebar — drag handle on the left edge. */
function ResizableSidebar({ children }) {
    const [width, setWidth] = React.useState(() => {
        try { return parseInt(localStorage.getItem(SIDEBAR_KEY), 10) || SIDEBAR_DEFAULT; }
        catch (e) { return SIDEBAR_DEFAULT; }
    });
    const dragging = React.useRef(false);
    const startX = React.useRef(0);
    const startW = React.useRef(0);

    const onMouseDown = React.useCallback((e) => {
        dragging.current = true;
        startX.current = e.clientX;
        startW.current = width;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [width]);

    React.useEffect(() => {
        const onMove = (e) => {
            if (!dragging.current) return;
            const delta = startX.current - e.clientX;
            const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startW.current + delta));
            setWidth(next);
        };
        const onUp = () => {
            if (!dragging.current) return;
            dragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            setWidth((w) => {
                try { localStorage.setItem(SIDEBAR_KEY, w); } catch (e) { /* ignore */ }
                return w;
            });
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);

    return (
        <div style={{ display: 'flex', flexShrink: 0, width, minWidth: SIDEBAR_MIN, maxWidth: SIDEBAR_MAX }}>
            {/* Drag handle — hover turns purple, cursor changes to col-resize */}
            <div
                onMouseDown={onMouseDown}
                style={{
                    width: 5,
                    flexShrink: 0,
                    cursor: 'col-resize',
                    background: 'var(--gray60, #c3cbd4)',
                    transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#5a4fcf'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--gray60, #c3cbd4)'; }}
                title="Drag to resize panel"
            />
            {/* Scrollable content */}
            <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
                {children}
            </div>
        </div>
    );
}

export default function CanvasPage({ boardId, onClose, initialColorScheme }) {
    const { board, loading, error } = useBoard(boardId);
    const { updateBoard } = useBoardMutations();
    const { versions, saveSnapshot, deleteVersion } = useVersions(boardId);

    const [excalidrawAPI, setExcalidrawAPI] = useState(null);
    const [activeTab, setActiveTab] = useState('shapes');
    const [name, setName] = useState('');
    const [tags, setTags] = useState('');
    const [presenting, setPresenting] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);
    const [colorScheme, setColorScheme] = useState(initialColorScheme || detectSplunkColorScheme());

    // Mirror the Excalidraw API into a ref so callbacks always see the live API
    // even if a stale closure captured an older state value.
    const apiRef = useRef(null);
    useEffect(() => {
        apiRef.current = excalidrawAPI;
    }, [excalidrawAPI]);

    useEffect(() => {
        if (board) {
            setName(board.name);
            setTags(board.tags || '');
        }
    }, [board]);

    // Re-detect Splunk theme when it might have changed (lightweight poll); only
    // call setColorScheme when the value actually changes so we don't trigger
    // unnecessary re-renders that can interfere with downstream panels.
    useEffect(() => {
        const t = setInterval(() => {
            const next = detectSplunkColorScheme();
            setColorScheme((prev) => (prev === next ? prev : next));
        }, 5000);
        return () => clearInterval(t);
    }, []);

    // Build Excalidraw's initialData from the loaded board. We compute this once
    // per board (memoized on board.id) and remount Excalidraw via key={board.id}
    // when the board changes. This sidesteps updateScene reconciliation issues
    // we hit when pushing previously-saved elements back into a live scene.
    const initialData = useMemo(() => {
        if (!board) return null;
        const incoming = board.elements || [];
        const restored = restoreElements(incoming, null);
        // eslint-disable-next-line no-console
        console.log(
            `[whiteboard_app] initialData for board ${board.id}: ${incoming.length} incoming -> ${restored.length} restored`
        );
        return {
            elements: restored,
            appState: {
                gridSize: 20,
                viewBackgroundColor: board.appState?.viewBackgroundColor || '#ffffff',
            },
            scrollToContent: restored.length > 0,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [board?.id]);

    const getElementsAndState = useCallback(() => {
        const api = apiRef.current;
        if (!api) return { elements: [], appState: {}, files: {} };
        const elements = api.getSceneElements();
        // eslint-disable-next-line no-console
        console.log('[whiteboard_app] getElementsAndState ->', elements.length, 'elements');
        return {
            elements,
            appState: serializableAppState(api.getAppState()),
            files: api.getFiles ? api.getFiles() : {},
        };
    }, []);

    const { markDirty } = useAutoSave(boardId, getElementsAndState);

    const onChange = useCallback(() => {
        markDirty();
    }, [markDirty]);

    const handleSaveNow = useCallback(async () => {
        if (!boardId) return;
        const { elements, appState } = getElementsAndState();
        // eslint-disable-next-line no-console
        console.log('[whiteboard_app] saving', elements.length, 'elements');
        try {
            await updateBoard(boardId, { name, tags, elements, appState });
            setSaveStatus({ type: 'success', text: `Saved ${elements.length} elements.` });
            setTimeout(() => setSaveStatus(null), 2000);
        } catch (e) {
            setSaveStatus({ type: 'error', text: e.message });
        }
    }, [boardId, getElementsAndState, name, tags, updateBoard]);

    const handleAddShape = useCallback(
        (newElements) => {
            if (!excalidrawAPI) return;
            const current = excalidrawAPI.getSceneElements();
            const restored = restoreElements(newElements, null);
            excalidrawAPI.updateScene({
                elements: [...current, ...restored],
            });
            markDirty();
        },
        [excalidrawAPI, markDirty]
    );

    // Insert a marketing SVG icon as an Excalidraw image element.
    // Excalidraw requires: (1) register the file via addFiles, (2) add an image
    // element referencing that fileId.
    const handleAddImage = useCallback(
        ({ id, svg, color }) => {
            const api = apiRef.current;
            if (!api) return;

            // Apply tint color to the SVG by injecting fill on the root element.
            const finalColor = color || '#000000';
            const tinted = svg.replace(
                /^(<svg\b[^>]*)(>)/i,
                (_, tag, close) => `${tag} fill="${finalColor}"${close}`,
            );
            const dataURL =
                'data:image/svg+xml;base64,' +
                btoa(unescape(encodeURIComponent(tinted)));

            // Use a color-specific fileId so different tints are registered as
            // separate files and don't overwrite each other in Excalidraw's cache.
            const fileId = `${id}-${finalColor.replace('#', '')}`;

            api.addFiles([
                {
                    id: fileId,
                    dataURL,
                    mimeType: 'image/svg+xml',
                    created: Date.now(),
                    lastRetrieved: Date.now(),
                },
            ]);
            const current = api.getSceneElements();
            const size = 120;
            const appState = api.getAppState();
            const cx = appState.width / 2;
            const cy = appState.height / 2;
            const newEl = {
                id: nanoid(),
                type: 'image',
                fileId,
                x: cx - size / 2,
                y: cy - size / 2,
                width: size,
                height: size,
                angle: 0,
                scale: [1, 1],
                status: 'saved',
                strokeColor: 'transparent',
                backgroundColor: 'transparent',
                fillStyle: 'solid',
                strokeWidth: 0,
                strokeStyle: 'solid',
                roughness: 0,
                opacity: 100,
                groupIds: [],
                frameId: null,
                roundness: null,
                seed: 0,
                versionNonce: 0,
                isDeleted: false,
                boundElements: null,
                updated: Date.now(),
                link: null,
                locked: false,
            };
            const restored = restoreElements([...current, newEl], null);
            api.updateScene({ elements: restored });
            markDirty();
        },
        [markDirty]
    );

    const handleApplyTemplate = useCallback(
        (templateElements, templateFiles) => {
            if (!excalidrawAPI) return;
            // Register any image files bundled with the template
            if (templateFiles && templateFiles.length) {
                excalidrawAPI.addFiles(templateFiles);
            }
            excalidrawAPI.updateScene({
                elements: restoreElements(templateElements, null),
            });
            markDirty();
        },
        [excalidrawAPI, markDirty]
    );

    const handleSnapshot = useCallback(
        async (label) => {
            const { elements, appState } = getElementsAndState();
            await saveSnapshot(label, elements, appState);
        },
        [getElementsAndState, saveSnapshot]
    );

    const handleRestore = useCallback(
        (version) => {
            if (!excalidrawAPI) return;
            // eslint-disable-next-line no-alert
            if (!window.confirm('Restore this snapshot? The current canvas will be replaced.')) {
                return;
            }
            excalidrawAPI.updateScene({
                elements: restoreElements(version.elements, null),
                appState: { ...(version.appState || {}), gridSize: 20 },
            });
            markDirty();
        },
        [excalidrawAPI, markDirty]
    );

    const getExportable = useCallback(async () => {
        if (!excalidrawAPI) throw new Error('Canvas not ready');
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();
        const blob = await exportToBlob({
            elements,
            appState: { ...appState, exportBackground: true, viewBackgroundColor: '#ffffff' },
            files: excalidrawAPI.getFiles(),
            mimeType: 'image/png',
            quality: 0.95,
        });
        const bitmap = await blobToImageSize(blob);
        return { blob, width: bitmap.width, height: bitmap.height };
    }, [excalidrawAPI]);

    const enterPresentation = () => {
        if (!excalidrawAPI) return;
        setPresenting(true);
    };

    const exitPresentation = () => setPresenting(false);

    const renderPanel = () => {
        // eslint-disable-next-line no-console
        console.log('[whiteboard_app] renderPanel for tab:', activeTab);
        switch (activeTab) {
            case 'shapes':
                return <ShapesPanel onAdd={handleAddShape} onAddImage={handleAddImage} />;
            case 'templates':
                return <TemplatePanel onApply={handleApplyTemplate} getElementsAndState={getElementsAndState} />;
            case 'history':
                return (
                    <HistoryPanel
                        versions={versions}
                        onSnapshot={handleSnapshot}
                        onRestore={handleRestore}
                        onDelete={deleteVersion}
                    />
                );
            case 'export':
                return (
                    <ExportPanel
                        boardId={boardId}
                        boardName={name}
                        getExportable={getExportable}
                    />
                );
            case 'libraries':
                return <LibraryPanel excalidrawAPI={excalidrawAPI} />;
            default:
                return <div style={{ padding: 12 }}>Unknown tab: {activeTab}</div>;
        }
    };

    if (loading) {
        return <div style={{ padding: 24 }}>Loading board…</div>;
    }
    if (error) {
        return (
            <div style={{ padding: 24 }}>
                <Message type="error">Failed to load board: {error}</Message>
                <Button onClick={onClose}>Back to list</Button>
            </div>
        );
    }
    if (!board) {
        return (
            <div style={{ padding: 24 }}>
                <Message type="warning">Board not found.</Message>
                <Button onClick={onClose}>Back to list</Button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 16px',
                    borderBottom: '1px solid var(--gray60, #c3cbd4)',
                    flexWrap: 'wrap',
                }}
            >
                <Button onClick={onClose} appearance="pill">
                    ← All boards
                </Button>
                <Text
                    value={name}
                    onChange={(_, { value }) => setName(value)}
                    placeholder="Board name"
                    style={{ width: 280 }}
                />
                <Text
                    value={tags}
                    onChange={(_, { value }) => setTags(value)}
                    placeholder="Tags (comma-separated)"
                    style={{ width: 220 }}
                />
                <Button appearance="primary" onClick={handleSaveNow}>
                    Save
                </Button>
                <Button onClick={enterPresentation}>Present</Button>
                {saveStatus && (
                    <span
                        style={{
                            fontSize: 12,
                            color: saveStatus.type === 'error' ? '#DC4E41' : '#53A051',
                        }}
                    >
                        {saveStatus.text}
                    </span>
                )}
            </div>

            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                    {initialData && (
                        <Excalidraw
                            key={board.id}
                            excalidrawAPI={setExcalidrawAPI}
                            onChange={onChange}
                            theme={colorScheme === 'dark' ? 'dark' : 'light'}
                            gridModeEnabled
                            initialData={initialData}
                        />
                    )}
                    {presenting && (
                        <PresentationMode
                            excalidrawAPI={excalidrawAPI}
                            onExit={exitPresentation}
                        />
                    )}
                </div>
                <ResizableSidebar>
                    <TabBar
                        activeTabId={activeTab}
                        onChange={(_, data) => {
                            // Splunk's TabBar passes { selectedTabId }; older builds may pass
                            // { activeTabId }. Accept either to be defensive.
                            const next = (data && (data.selectedTabId || data.activeTabId)) || activeTab;
                            setActiveTab(next);
                        }}
                    >
                        {TABS.map((t) => (
                            <TabBar.Tab key={t.value} label={t.label} tabId={t.value} />
                        ))}
                    </TabBar>
                    <PanelErrorBoundary key={activeTab}>{renderPanel()}</PanelErrorBoundary>
                </ResizableSidebar>
            </div>
        </div>
    );
}

// Persist only the fields we actually want to restore, so we don't carry
// transient UI state (showWelcomeScreen, currentItem*, editingElement, etc.)
// that can hide or otherwise disrupt elements on reload.
function serializableAppState(appState) {
    if (!appState) return {};
    return {
        viewBackgroundColor: appState.viewBackgroundColor || '#ffffff',
        gridSize: appState.gridSize || 20,
    };
}

function blobToImageSize(blob) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            const { width, height } = img;
            URL.revokeObjectURL(url);
            resolve({ width, height });
        };
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(e);
        };
        img.src = url;
    });
}
