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
import { debug } from '../lib/log';

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
    const [selectedIds, setSelectedIds] = useState({});
    const [gridEnabled, setGridEnabled] = useState(true);

    // Mirror the Excalidraw API into a ref so callbacks always see the live API
    // even if a stale closure captured an older state value.
    const apiRef = useRef(null);
    // Track last insert position for cascading smart placement
    const lastInsertRef = useRef({ time: 0, x: 0, y: 0 });

    useEffect(() => {
        apiRef.current = excalidrawAPI;
    }, [excalidrawAPI]);

    /**
     * Compute the scene-space insert position for a new element of size (w × h).
     * - First insert (or after >4 s pause): snapped to viewport center.
     * - Subsequent quick inserts: cascade diagonally by 2 grid cells.
     * - Wraps back toward center if the cascade drifts too far.
     */
    const computeInsertPos = useCallback((api, w = 0, h = 0) => {
        const { x: cx, y: cy, grid } = getViewportSceneCenter(api);
        const snap = (v) => snapGrid(v, grid);
        const now = Date.now();
        const last = lastInsertRef.current;
        const CASCADE_MS = 4000;

        let ix, iy;
        if (now - last.time > CASCADE_MS) {
            ix = snap(cx);
            iy = snap(cy);
        } else {
            ix = snap(last.x + grid * 3);
            iy = snap(last.y + grid * 2);
            // Wrap if cascaded more than ~6 grid cells from center
            if (Math.abs(ix - cx) > grid * 7 || Math.abs(iy - cy) > grid * 7) {
                ix = snap(cx);
                iy = snap(cy);
            }
        }
        lastInsertRef.current = { time: now, x: ix, y: iy };
        return { x: ix - w / 2, y: iy - h / 2 };
    }, []);

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
        debug(
            `initialData for board ${board.id}: ${incoming.length} incoming -> ${restored.length} restored`
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
        debug('getElementsAndState ->', elements.length, 'elements');
        return {
            elements,
            appState: serializableAppState(api.getAppState()),
            files: api.getFiles ? api.getFiles() : {},
        };
    }, []);

    const { markDirty } = useAutoSave(boardId, getElementsAndState);

    const onChange = useCallback((elements, appState) => {
        markDirty();
        if (appState) setSelectedIds(appState.selectedElementIds ?? {});
    }, [markDirty]);

    const handleSaveNow = useCallback(async () => {
        if (!boardId) return;
        const { elements, appState } = getElementsAndState();
        debug('saving', elements.length, 'elements');
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
            const restored = restoreElements(newElements, null);

            // Compute bounding box of the incoming elements (they originate at ~0,0)
            let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            restored.forEach((el) => {
                if (el.x != null) {
                    x0 = Math.min(x0, el.x);
                    y0 = Math.min(y0, el.y);
                    x1 = Math.max(x1, el.x + (el.width || 0));
                    y1 = Math.max(y1, el.y + (el.height || 0));
                }
            });
            if (!isFinite(x0)) { x0 = y0 = 0; }
            const w = Math.max(x1 - x0, 1);
            const h = Math.max(y1 - y0, 1);

            // Target: viewport scene center, cascaded and snapped to grid
            const pos = computeInsertPos(excalidrawAPI, w, h);
            const dx = pos.x - x0;
            const dy = pos.y - y0;

            const translated = restored.map((el) =>
                el.x != null ? { ...el, x: el.x + dx, y: el.y + dy } : el
            );

            const current = excalidrawAPI.getSceneElements();
            excalidrawAPI.updateScene({ elements: [...current, ...translated] });
            markDirty();
        },
        [excalidrawAPI, computeInsertPos, markDirty]
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
            const pos = computeInsertPos(api, size, size);
            const newEl = {
                id: nanoid(),
                type: 'image',
                fileId,
                x: pos.x,
                y: pos.y,
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
        [computeInsertPos, markDirty]
    );    const handleApplyTemplate = useCallback(
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
        debug('renderPanel for tab:', activeTab);
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
                <Button
                    title="Toggle grid / snap (affects newly inserted shapes)"
                    onClick={() => setGridEnabled((v) => !v)}
                    style={{ fontFamily: 'monospace', minWidth: 90 }}
                >
                    {gridEnabled ? '⊞ Grid on' : '□ Grid off'}
                </Button>
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
                            gridModeEnabled={gridEnabled}
                            initialData={initialData}
                        />
                    )}
                    {presenting && (
                        <PresentationMode
                            excalidrawAPI={excalidrawAPI}
                            onExit={exitPresentation}
                        />
                    )}
                    {/* Floating alignment / group toolbar — visible when elements are selected */}
                    <SelectionToolbar api={excalidrawAPI} selectedIds={selectedIds} />
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

// ── Viewport → scene coordinate helpers ─────────────────────────────────────

/**
 * Convert the current viewport center to scene-space coordinates.
 * Excalidraw formula: sceneX = (viewportX - scrollX) / zoom
 */
function getViewportSceneCenter(api) {
    const a = api.getAppState();
    const zoom = a.zoom?.value ?? 1;
    return {
        x: (a.width / 2 - a.scrollX) / zoom,
        y: (a.height / 2 - a.scrollY) / zoom,
        grid: a.gridSize || 20,
    };
}

function snapGrid(v, grid) {
    return grid ? Math.round(v / grid) * grid : v;
}

// ── Tiny button used in SelectionToolbar ─────────────────────────────────────

function ToolBtn({ children, title, onClick }) {
    const [hov, setHov] = React.useState(false);
    return (
        <button
            title={title}
            onClick={onClick}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                all: 'unset',
                cursor: 'pointer',
                fontSize: 12,
                padding: '3px 8px',
                borderRadius: 5,
                border: '1px solid transparent',
                background: hov ? 'var(--gray90, #e2e6ea)' : 'transparent',
                color: 'inherit',
                userSelect: 'none',
                whiteSpace: 'nowrap',
                lineHeight: 1.4,
            }}
        >
            {children}
        </button>
    );
}

function TBSep() {
    return (
        <span
            style={{
                display: 'inline-block',
                width: 1,
                height: 20,
                background: 'var(--gray60, #c3cbd4)',
                margin: '0 3px',
                verticalAlign: 'middle',
            }}
        />
    );
}

// ── SelectionToolbar ──────────────────────────────────────────────────────────

function SelectionToolbar({ api, selectedIds }) {
    const ids = React.useMemo(
        () => Object.keys(selectedIds || {}).filter((k) => selectedIds[k]),
        [selectedIds]
    );
    if (ids.length === 0) return null;

    const getSelected = () => {
        if (!api) return [];
        const sel = selectedIds || {};
        return api.getSceneElements().filter((el) => sel[el.id] && !el.isDeleted);
    };

    const group = () => {
        const sel = getSelected();
        if (sel.length < 2) return;
        const gid = `grp-${Math.random().toString(36).slice(2, 10)}`;
        const all = api.getSceneElements();
        api.updateScene({
            elements: all.map((el) =>
                selectedIds[el.id]
                    ? { ...el, groupIds: [gid, ...(el.groupIds || []).filter((g) => g !== gid)] }
                    : el
            ),
        });
    };

    const ungroup = () => {
        const sel = getSelected();
        const gids = new Set(sel.flatMap((el) => el.groupIds || []));
        if (gids.size === 0) return;
        const all = api.getSceneElements();
        api.updateScene({
            elements: all.map((el) => {
                const has = (el.groupIds || []).some((g) => gids.has(g));
                return has ? { ...el, groupIds: (el.groupIds || []).filter((g) => !gids.has(g)) } : el;
            }),
        });
    };

    const align = (axis) => {
        const sel = getSelected();
        if (sel.length < 2) return;
        const bbs = sel.map((el) => ({
            id: el.id,
            x: el.x ?? 0, y: el.y ?? 0,
            w: el.width ?? 0, h: el.height ?? 0,
        }));

        let ref;
        switch (axis) {
            case 'left':   ref = Math.min(...bbs.map((b) => b.x)); break;
            case 'right':  ref = Math.max(...bbs.map((b) => b.x + b.w)); break;
            case 'cx':     ref = bbs.reduce((s, b) => s + b.x + b.w / 2, 0) / bbs.length; break;
            case 'top':    ref = Math.min(...bbs.map((b) => b.y)); break;
            case 'bottom': ref = Math.max(...bbs.map((b) => b.y + b.h)); break;
            case 'cy':     ref = bbs.reduce((s, b) => s + b.y + b.h / 2, 0) / bbs.length; break;
            default: return;
        }

        const all = api.getSceneElements();
        const sel2 = selectedIds || {};
        api.updateScene({
            elements: all.map((el) => {
                if (!sel2[el.id]) return el;
                const b = bbs.find((b) => b.id === el.id);
                switch (axis) {
                    case 'left':   return { ...el, x: ref };
                    case 'right':  return { ...el, x: ref - b.w };
                    case 'cx':     return { ...el, x: ref - b.w / 2 };
                    case 'top':    return { ...el, y: ref };
                    case 'bottom': return { ...el, y: ref - b.h };
                    case 'cy':     return { ...el, y: ref - b.h / 2 };
                    default: return el;
                }
            }),
        });
    };

    return (
        <div
            style={{
                position: 'absolute',
                bottom: 56,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                background: 'var(--color-surface, #fff)',
                border: '1px solid var(--gray60, #c3cbd4)',
                borderRadius: 8,
                padding: '3px 8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
                pointerEvents: 'all',
                color: 'var(--color-on-background, #1b1b1b)',
            }}
        >
            <span style={{ fontSize: 11, opacity: 0.55, paddingRight: 6 }}>
                {ids.length} selected
            </span>
            <ToolBtn title="Group elements (Ctrl+G)" onClick={group}>⊞ Group</ToolBtn>
            <ToolBtn title="Ungroup (Ctrl+Shift+G)" onClick={ungroup}>⊟ Ungroup</ToolBtn>
            {ids.length >= 2 && (
                <>
                    <TBSep />
                    <ToolBtn title="Align left edges" onClick={() => align('left')}>⇤ Left</ToolBtn>
                    <ToolBtn title="Center horizontally" onClick={() => align('cx')}>↔ H ctr</ToolBtn>
                    <ToolBtn title="Align right edges" onClick={() => align('right')}>Right ⇥</ToolBtn>
                    <TBSep />
                    <ToolBtn title="Align top edges" onClick={() => align('top')}>⇧ Top</ToolBtn>
                    <ToolBtn title="Center vertically" onClick={() => align('cy')}>↕ V ctr</ToolBtn>
                    <ToolBtn title="Align bottom edges" onClick={() => align('bottom')}>Bot ⇩</ToolBtn>
                </>
            )}
        </div>
    );
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
