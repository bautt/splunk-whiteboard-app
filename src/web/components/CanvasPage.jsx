import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Excalidraw, exportToBlob, restoreElements, restoreAppState, useHandleLibrary } from '@excalidraw/excalidraw';
import '../excalidraw-overrides.css';

import Button from '@splunk/react-ui/Button';
import Text from '@splunk/react-ui/Text';
import Message from '@splunk/react-ui/Message';
import Modal from '@splunk/react-ui/Modal';
import P from '@splunk/react-ui/Paragraph';

import LayoutPanels from '@splunk/react-icons/LayoutPanels';
import FloppyDisk from '@splunk/react-icons/FloppyDisk';
import ListNumbered from '@splunk/react-icons/ListNumbered';
import Bookshelf from '@splunk/react-icons/Bookshelf';
import Clock from '@splunk/react-icons/Clock';
import CloudArrowUp from '@splunk/react-icons/CloudArrowUp';
import Paintbrush from '@splunk/react-icons/Paintbrush';

import AppearancePanel from './AppearancePanel';

import TemplatePanel from './TemplatePanel';
import ShapesPanel from './ShapesPanel';
import BuildPanel from './BuildPanel';
import HistoryPanel from './HistoryPanel';
import ExportPanel from './ExportPanel';
import LibraryPanel from './LibraryPanel';
import PresentationMode from './PresentationMode';
import PanelErrorBoundary from './PanelErrorBoundary';
import SidebarIconTabs from './SidebarIconTabs';
import ExcalidrawPreferences, {
    defaultCanvasAppState,
    serializableCanvasAppState,
} from './ExcalidrawPreferences';

import { useBoard, useBoardMutations, useAutoSave } from '../hooks/useKVStore';
import { useVersions } from '../hooks/useVersions';
import { useRevisions } from '../hooks/useRevisions';
import { BOARD_SCOPE, BOARD_VISIBILITY, canShareBoard, visibilityLabel, isConflictError } from '../lib/boardScope';
import { nanoid } from '../lib/nanoid';
import {
    applyCanvasAppearance,
    boardAppearanceState,
    displayBackgroundColor,
    normalizeHexColor,
    normalizeTheme,
    resolveAppearancePatch,
    storedBackgroundColor,
} from '../lib/canvasAppearance';
import { debug } from '../lib/log';
import { filesToMap, rehydrateMissingFiles, registerBoardFiles } from '../lib/boardFiles';
import { sanitizeElementsForPersistence, prepareRevealSnapshot, restoreSnapshot } from '../lib/build';
import {
    insertRevision,
    MAX_REVISIONS_PER_BOARD,
    REVISION_SOURCES,
} from '../lib/historyStore';
import { APP_VERSION } from '../lib/version';
import { fitIconDimensions, parseSvgViewBox, prepareIconFile, upsertSvgImageFile } from '../lib/iconFiles';

const TABS = [
    { label: 'Shapes', value: 'shapes', Icon: LayoutPanels },
    { label: 'Templates', value: 'templates', Icon: FloppyDisk },
    { label: 'Build', value: 'build', Icon: ListNumbered },
    { label: 'Canvas', value: 'appearance', Icon: Paintbrush },
    { label: 'Libraries', value: 'libraries', Icon: Bookshelf },
    { label: 'History', value: 'history', Icon: Clock },
    { label: 'Export', value: 'export', Icon: CloudArrowUp },
];

const SIDEBAR_MIN = 240;
const SIDEBAR_MAX = 600;
const SIDEBAR_DEFAULT = 280;
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

export default function CanvasPage({ boardId, onClose }) {
    const { board, loading, error, refresh: refreshBoard, setBoard } = useBoard(boardId);
    const boardScope = board?.scope ?? BOARD_SCOPE.SHARED;
    const { updateBoard, shareBoard } = useBoardMutations();
    const { versions, saveSnapshot, deleteVersion, maxSnapshots } = useVersions(boardId, boardScope);
    const { revisions, deleteRevision, refresh: refreshRevisions } = useRevisions(boardId, boardScope);

    const [excalidrawAPI, setExcalidrawAPI] = useState(null);
    const [activeTab, setActiveTab] = useState('shapes');
    const [name, setName] = useState('');
    const [tags, setTags] = useState('');
    const [restoring, setRestoring] = useState(false);
    const [presenting, setPresenting] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);
    const [shareStatus, setShareStatus] = useState(null);
    const [sharing, setSharing] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [conflict, setConflict] = useState(false);
    const [selectedIds, setSelectedIds] = useState({});
    const [canvasAppState, setCanvasAppState] = useState(() => defaultCanvasAppState());

    // Mirror the Excalidraw API into a ref so callbacks always see the live API
    // even if a stale closure captured an older state value.
    const apiRef = useRef(null);
    // Track last insert position for cascading smart placement
    const lastInsertRef = useRef({ time: 0, x: 0, y: 0 });
    // When true, scene changes are not persisted (used during presentation reveal).
    const suppressSaveRef = useRef(false);
    const closingMermaidRef = useRef(false);
    const appearanceSyncRef = useRef(false);
    const canvasReadyRef = useRef(false);
    // Last board `updated_at` this client has synced with, for conflict detection.
    const syncedAtRef = useRef(0);
    const shareButtonRef = useRef(null);

    const handleExcalidrawAPI = useCallback((api) => {
        apiRef.current = api;
        setExcalidrawAPI((prev) => (prev === api ? prev : api));
    }, []);

    // Enable Excalidraw's library install flow: consumes the `addLibrary` token
    // returned by libraries.excalidraw.com ("Add to Excalidraw") and persists
    // installed/imported library items across reloads. Without this hook the
    // native "Browse libraries" button dead-ends (opens the site but nothing
    // installs the chosen library back into the canvas).
    useHandleLibrary({ excalidrawAPI });

    /**
     * Compute the scene-space insert position for a new element of size (w × h).
     * - First insert (or after >4 s pause): viewport center.
     * - Subsequent quick inserts: cascade diagonally (grid-aligned only when grid snap is on).
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
            const stepX = grid ? grid * 3 : 40;
            const stepY = grid ? grid * 2 : 28;
            ix = snap(last.x + stepX);
            iy = snap(last.y + stepY);
            // Wrap if cascaded too far from center
            const limit = grid ? grid * 7 : 280;
            if (Math.abs(ix - cx) > limit || Math.abs(iy - cy) > limit) {
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

    useEffect(() => {
        if (board) {
            syncedAtRef.current = board.updatedAt || 0;
            setConflict(false);
        }
    }, [board?.id, board?.updatedAt]);

    useEffect(() => {
        if (!board) return;
        setCanvasAppState(defaultCanvasAppState(board.appState || {}));
    }, [board?.id]);

    const canvasTheme = normalizeTheme(canvasAppState);

    // Where libraries.excalidraw.com returns after "Add to Excalidraw". Strip any
    // existing hash so the returned #addLibrary token isn't compounded.
    const libraryReturnUrl = useMemo(
        () => (typeof window !== 'undefined' ? window.location.href.split('#')[0] : undefined),
        []
    );

    // Build Excalidraw initialData once per board; theme/background come from saved appState.
    const initialData = useMemo(() => {
        if (!board) return null;
        const incoming = board.elements || [];
        const restored = restoreElements(incoming, null);
        const appearance = boardAppearanceState(board.appState || {});
        debug(
            `initialData for board ${board.id}: ${incoming.length} incoming -> ${restored.length} restored`
        );
        return {
            elements: restored,
            files: filesToMap(board.files),
            appState: restoreAppState(
                defaultCanvasAppState({
                    ...(board.appState || {}),
                    ...appearance,
                }),
                null
            ),
            scrollToContent: restored.length > 0,
        };
    }, [board?.id]);

    const getElementsAndState = useCallback(() => {
        const api = apiRef.current;
        if (!api) return { elements: [], appState: {}, files: {} };
        const elements = sanitizeElementsForPersistence(api.getSceneElements());
        debug('getElementsAndState ->', elements.length, 'elements');
        return {
            elements,
            appState: serializableCanvasAppState(api.getAppState()),
            files: api.getFiles ? api.getFiles() : {},
        };
    }, []);

    useEffect(() => {
        canvasReadyRef.current = false;
    }, [boardId]);

    useEffect(() => {
        if (excalidrawAPI && board && !loading) {
            canvasReadyRef.current = true;
        }
    }, [excalidrawAPI, board, loading]);

    const isCanvasReady = useCallback(() => canvasReadyRef.current, []);

    const { markDirty, resume: resumeAutoSave } = useAutoSave(
        boardId,
        boardScope,
        getElementsAndState,
        {
            isCanvasReady,
            getExpectedUpdatedAt: () => syncedAtRef.current,
            onSaved: (ts) => { syncedAtRef.current = ts; },
            onConflict: () => setConflict(true),
        }
    );

    // One-shot sync after Excalidraw mounts — ensures saved theme/bg apply to the live scene.
    useEffect(() => {
        const api = apiRef.current;
        if (!api || !board) return;
        const appearance = boardAppearanceState(board.appState || {});
        const timer = window.setTimeout(() => {
            const cur = api.getAppState();
            if (
                cur.theme === appearance.theme &&
                normalizeHexColor(cur.viewBackgroundColor) ===
                    normalizeHexColor(appearance.viewBackgroundColor)
            ) {
                return;
            }
            applyCanvasAppearance(api, appearance);
        }, 0);
        return () => window.clearTimeout(timer);
    }, [excalidrawAPI, board?.id]);

    const handleAppearanceChange = useCallback(
        (patch) => {
            setCanvasAppState((prev) => {
                const resolved = resolveAppearancePatch(patch, prev);
                if (apiRef.current) {
                    appearanceSyncRef.current = true;
                    applyCanvasAppearance(apiRef.current, resolved, prev);
                }
                return { ...prev, ...resolved };
            });
            markDirty();
        },
        [markDirty]
    );

    const onChange = useCallback((elements, appState) => {
        // Mermaid dialog crashes on React 17 (useDeferredValue); close if opened anyway.
        if (appState?.openDialog === 'mermaid') {
            if (!closingMermaidRef.current && apiRef.current) {
                closingMermaidRef.current = true;
                apiRef.current.updateScene({ appState: { openDialog: null } });
                requestAnimationFrame(() => {
                    closingMermaidRef.current = false;
                });
            }
            return;
        }
        // While presenting, the build reveal mutates the live scene (opacity);
        // those transient changes must never be persisted.
        if (!suppressSaveRef.current) markDirty();
        if (appState) {
            const theme = normalizeTheme(appState);
            const nextSel = appState.selectedElementIds ?? {};
            setSelectedIds((prev) => (sameSelection(prev, nextSel) ? prev : nextSel));
            setCanvasAppState((prev) => {
                let nextPrefs = {
                    gridSize: appState.gridSize ?? null,
                    objectsSnapModeEnabled: appState.objectsSnapModeEnabled ?? true,
                    isBindingEnabled: appState.isBindingEnabled ?? true,
                    theme: appState.theme,
                    viewBackgroundColor: appState.viewBackgroundColor,
                    displayBackgroundColor: prev.displayBackgroundColor,
                };

                if (appearanceSyncRef.current) {
                    appearanceSyncRef.current = false;
                    const synced = resolveAppearancePatch(
                        { viewBackgroundColor: appState.viewBackgroundColor, theme },
                        prev
                    );
                    nextPrefs = { ...nextPrefs, ...synced };
                    return sameCanvasPrefs(prev, nextPrefs) ? prev : { ...prev, ...nextPrefs };
                }

                const themeChanged = normalizeTheme(prev) !== theme;
                if (themeChanged && apiRef.current) {
                    const resolved = resolveAppearancePatch({ theme }, prev);
                    appearanceSyncRef.current = true;
                    applyCanvasAppearance(apiRef.current, resolved, prev);
                    nextPrefs = { ...nextPrefs, ...resolved };
                } else if (!themeChanged) {
                    const stored = normalizeHexColor(appState.viewBackgroundColor);
                    const prevDisplay = normalizeHexColor(prev.displayBackgroundColor);
                    const derivedDisplay = displayBackgroundColor(stored, theme);
                    const storedMatchesDisplay =
                        prevDisplay &&
                        normalizeHexColor(storedBackgroundColor(prevDisplay, theme)) === stored;
                    nextPrefs.displayBackgroundColor =
                        storedMatchesDisplay || prevDisplay === derivedDisplay
                            ? prevDisplay || derivedDisplay
                            : derivedDisplay;
                    nextPrefs.viewBackgroundColor = stored;
                }

                return sameCanvasPrefs(prev, nextPrefs) ? prev : { ...prev, ...nextPrefs };
            });
        }
    }, [markDirty]);

    const handleSaveNow = useCallback(async (options = {}) => {
        if (!boardId || !board) return;
        const { force = false } = options;
        const { elements, appState, files } = getElementsAndState();
        debug('saving', elements.length, 'elements');
        try {
            const result = await updateBoard(boardId, {
                name,
                tags,
                elements,
                appState,
                files,
                saveSource: REVISION_SOURCES.MANUAL_SAVE,
            }, board.scope, force ? {} : { expectedUpdatedAt: syncedAtRef.current });
            if (result?.updatedAt) syncedAtRef.current = result.updatedAt;
            setConflict(false);
            resumeAutoSave();
            setSaveStatus({ type: 'success', text: `Saved ${elements.length} elements.` });
            refreshRevisions();
            setTimeout(() => setSaveStatus(null), 2000);
        } catch (e) {
            if (isConflictError(e)) {
                setConflict(true);
                setSaveStatus(null);
                return;
            }
            setSaveStatus({ type: 'error', text: e.message });
        }
    }, [boardId, board, getElementsAndState, name, tags, updateBoard, refreshRevisions, resumeAutoSave]);

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
        ({ id, svg, color, tintable = true }) => {
            const api = apiRef.current;
            if (!api) return;

            const { fileId, dataURL, mimeType } = prepareIconFile({ id, svg, color, tintable });
            upsertSvgImageFile(api, fileId, dataURL, mimeType);
            const current = api.getSceneElements();
            const natural = parseSvgViewBox(svg);
            const { width, height } = fitIconDimensions(natural.width, natural.height);
            const pos = computeInsertPos(api, width, height);
            const newEl = {
                id: nanoid(),
                type: 'image',
                fileId,
                x: pos.x,
                y: pos.y,
                width,
                height,
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
        (templateElements, templateFiles, templateAppState) => {
            if (!excalidrawAPI) return;
            const files = rehydrateMissingFiles(templateElements, templateFiles);
            registerBoardFiles(excalidrawAPI, files);
            excalidrawAPI.updateScene({
                elements: restoreElements(templateElements, null),
            });
            // Templates may declare an intended theme/background (e.g. the dark
            // Splunk Platform canvas). Apply it so the board doesn't inherit the
            // previous board's appearance.
            if (templateAppState && (templateAppState.theme || templateAppState.displayBackgroundColor)) {
                handleAppearanceChange({
                    theme: normalizeTheme(templateAppState),
                    displayBackgroundColor: templateAppState.displayBackgroundColor,
                });
            }
            markDirty();
        },
        [excalidrawAPI, markDirty, handleAppearanceChange]
    );

    const handleSnapshot = useCallback(
        async (label) => {
            const { elements, appState, files } = getElementsAndState();
            await saveSnapshot(label, elements, appState, files);
        },
        [getElementsAndState, saveSnapshot]
    );

    const handleRestore = useCallback(
        async (entry, { checkpointFirst = true } = {}) => {
            if (!excalidrawAPI || !boardId || !board) return;
            setRestoring(true);
            try {
                if (checkpointFirst) {
                    const current = getElementsAndState();
                    await insertRevision(boardId, {
                        ...current,
                        source: REVISION_SOURCES.PRE_RESTORE,
                        label: 'Before restore',
                    }, board.scope);
                }
                const files = rehydrateMissingFiles(entry.elements, entry.files);
                registerBoardFiles(excalidrawAPI, files);
                const appState = defaultCanvasAppState({
                    ...(entry.appState || {}),
                    gridSize: entry.appState?.gridSize ?? null,
                    objectsSnapModeEnabled: entry.appState?.objectsSnapModeEnabled ?? true,
                    isBindingEnabled: entry.appState?.isBindingEnabled ?? true,
                });
                excalidrawAPI.updateScene({
                    elements: restoreElements(entry.elements, null),
                    appState,
                });
                const result = await updateBoard(boardId, {
                    elements: entry.elements,
                    appState: serializableCanvasAppState(appState),
                    files,
                    saveSource: REVISION_SOURCES.MANUAL_SAVE,
                }, board.scope);
                if (result?.updatedAt) syncedAtRef.current = result.updatedAt;
                setConflict(false);
                resumeAutoSave();
                await refreshRevisions();
                setSaveStatus({
                    type: 'success',
                    text: `Restored ${entry.elementCount} elements.`,
                });
                setTimeout(() => setSaveStatus(null), 3000);
            } catch (e) {
                setSaveStatus({ type: 'error', text: e.message });
            } finally {
                setRestoring(false);
            }
        },
        [excalidrawAPI, boardId, board, getElementsAndState, updateBoard, refreshRevisions, resumeAutoSave]
    );

    const getExportable = useCallback(async () => {
        if (!excalidrawAPI) throw new Error('Canvas not ready');
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();
        const blob = await exportToBlob({
            elements,
            appState: {
                ...appState,
                exportBackground: true,
                viewBackgroundColor: appState.viewBackgroundColor,
            },
            files: excalidrawAPI.getFiles(),
            mimeType: 'image/png',
            quality: 0.95,
        });
        const bitmap = await blobToImageSize(blob);
        return { blob, width: bitmap.width, height: bitmap.height };
    }, [excalidrawAPI]);

    const enterPresentation = () => {
        if (!excalidrawAPI) return;
        // Exit any in-progress preview/reveal state so Present snapshots the full board.
        excalidrawAPI.updateScene({
            elements: restoreSnapshot(
                prepareRevealSnapshot(excalidrawAPI.getSceneElements())
            ),
        });
        setPresenting(true);
    };

    const exitPresentation = () => setPresenting(false);

    const handleImportBoard = useCallback(
        async (parsed) => {
            if (!excalidrawAPI || !boardId || !board) return;
            const files = rehydrateMissingFiles(parsed.elements, parsed.files);
            registerBoardFiles(excalidrawAPI, files);
            const appState = defaultCanvasAppState({
                ...(parsed.appState || {}),
                gridSize: parsed.appState?.gridSize ?? null,
                objectsSnapModeEnabled: parsed.appState?.objectsSnapModeEnabled ?? true,
                isBindingEnabled: parsed.appState?.isBindingEnabled ?? true,
            });
            excalidrawAPI.updateScene({
                elements: restoreElements(parsed.elements, null),
                appState,
            });
            if (parsed.name) setName(parsed.name);
            const result = await updateBoard(boardId, {
                name: parsed.name || name,
                elements: parsed.elements,
                appState: serializableCanvasAppState(appState),
                files,
                saveSource: REVISION_SOURCES.MANUAL_SAVE,
            }, board.scope);
            if (result?.updatedAt) syncedAtRef.current = result.updatedAt;
            setConflict(false);
            resumeAutoSave();
            await refreshRevisions();
            setSaveStatus({
                type: 'success',
                text: `Imported ${parsed.elements.length} elements.`,
            });
            setTimeout(() => setSaveStatus(null), 3000);
        },
        [excalidrawAPI, boardId, board, name, updateBoard, refreshRevisions, resumeAutoSave]
    );

    const handleShareWithEveryone = useCallback(async () => {
        if (!board || !canShareBoard(board)) return;
        setShareModalOpen(false);
        setSharing(true);
        setShareStatus(null);
        try {
            const shared = await shareBoard(board);
            setBoard((prev) => (prev ? {
                ...prev,
                scope: shared.scope,
                visibility: shared.visibility,
            } : prev));
            await refreshBoard();
            await refreshRevisions();
            setShareStatus(shared.warning
                ? { type: 'warning', text: shared.warning }
                : { type: 'success', text: 'Board is now shared with everyone on this instance.' });
        } catch (e) {
            setShareStatus({ type: 'error', text: e.message });
        } finally {
            setSharing(false);
        }
    }, [board, shareBoard, setBoard, refreshBoard, refreshRevisions]);

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
                        revisions={revisions}
                        snapshots={versions}
                        maxRevisions={MAX_REVISIONS_PER_BOARD}
                        maxSnapshots={maxSnapshots}
                        onSnapshot={handleSnapshot}
                        onRestore={handleRestore}
                        onDeleteRevision={deleteRevision}
                        onDeleteSnapshot={deleteVersion}
                        restoring={restoring}
                    />
                );
            case 'export':
                return (
                    <ExportPanel
                        boardId={boardId}
                        boardName={name}
                        appVersion={APP_VERSION}
                        canShareLink={board.visibility === BOARD_VISIBILITY.SHARED}
                        getExportable={getExportable}
                        getBoardState={getElementsAndState}
                        onImportBoard={handleImportBoard}
                    />
                );
            case 'build':
                return (
                    <BuildPanel
                        excalidrawAPI={excalidrawAPI}
                        markDirty={markDirty}
                        selectedIds={selectedIds}
                        suppressSaveRef={suppressSaveRef}
                    />
                );
            case 'appearance':
                return (
                    <AppearancePanel
                        canvasAppState={canvasAppState}
                        onAppearanceChange={handleAppearanceChange}
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
                <span
                    style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: board.visibility === BOARD_VISIBILITY.SHARED
                            ? 'rgba(90, 79, 207, 0.12)'
                            : 'var(--gray90, #e2e6ea)',
                        color: board.visibility === BOARD_VISIBILITY.SHARED
                            ? '#5a4fcf'
                            : 'inherit',
                    }}
                >
                    {visibilityLabel(board.visibility)}
                </span>
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
                <Button appearance="primary" onClick={() => handleSaveNow()}>
                    Save
                </Button>
                {canShareBoard(board) && (
                    <Button
                        elementRef={shareButtonRef}
                        appearance="secondary"
                        onClick={() => setShareModalOpen(true)}
                        disabled={sharing}
                    >
                        {sharing ? 'Sharing…' : 'Share with everyone'}
                    </Button>
                )}
                <Button onClick={enterPresentation}>Present</Button>
                {shareStatus && (
                    <span
                        style={{
                            fontSize: 12,
                            color: shareStatus.type === 'error'
                                ? '#DC4E41'
                                : shareStatus.type === 'warning'
                                    ? '#CBA700'
                                    : '#53A051',
                        }}
                    >
                        {shareStatus.text}
                    </span>
                )}
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

            {conflict && (
                <Message
                    appearance="fill"
                    type="warning"
                    onRequestRemove={() => setConflict(false)}
                >
                    This board was changed elsewhere since you opened it. Auto-save is paused to
                    avoid overwriting those changes.{' '}
                    <Button
                        inline
                        appearance="secondary"
                        onClick={() => window.location.reload()}
                    >
                        Reload latest
                    </Button>{' '}
                    <Button
                        inline
                        appearance="secondary"
                        onClick={() => handleSaveNow({ force: true })}
                    >
                        Overwrite with my changes
                    </Button>
                </Message>
            )}

            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                <div
                    className="excalidraw-app-surface"
                    style={{
                        flex: 1,
                        minWidth: 0,
                        minHeight: 0,
                        position: 'relative',
                    }}
                >
                    {initialData && (
                        <Excalidraw
                            key={board.id}
                            excalidrawAPI={handleExcalidrawAPI}
                            onChange={onChange}
                            theme={canvasTheme}
                            initialData={initialData}
                            libraryReturnUrl={libraryReturnUrl}
                            UIOptions={{
                                canvasActions: {
                                    toggleTheme: true,
                                    changeViewBackgroundColor: true,
                                },
                            }}
                        >
                            <ExcalidrawPreferences
                                excalidrawAPI={excalidrawAPI}
                                appState={canvasAppState}
                            />
                        </Excalidraw>
                    )}
                    {presenting && (
                        <PresentationMode
                            excalidrawAPI={excalidrawAPI}
                            onExit={exitPresentation}
                            suppressSaveRef={suppressSaveRef}
                        />
                    )}
                    {/* Floating alignment / group toolbar — visible when elements are selected */}
                    <SelectionToolbar api={excalidrawAPI} selectedIds={selectedIds} />
                </div>
                <ResizableSidebar>
                    <SidebarIconTabs
                        tabs={TABS}
                        activeTab={activeTab}
                        onChange={setActiveTab}
                    >
                        <PanelErrorBoundary key={activeTab}>{renderPanel()}</PanelErrorBoundary>
                    </SidebarIconTabs>
                </ResizableSidebar>
            </div>

            <Modal
                open={shareModalOpen}
                onRequestClose={() => setShareModalOpen(false)}
                returnFocus={shareButtonRef}
                style={{ width: 460 }}
            >
                <Modal.Header
                    title="Share with everyone?"
                    onRequestClose={() => setShareModalOpen(false)}
                />
                <Modal.Body>
                    <P>
                        This moves the board to the shared area of this Splunk instance.
                        Every user who can open Whiteboard App will be able to view and edit it.
                    </P>
                    <P>Sharing cannot be undone from the app. Continue?</P>
                </Modal.Body>
                <Modal.Footer>
                    <Button appearance="secondary" onClick={() => setShareModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button appearance="primary" onClick={handleShareWithEveryone} disabled={sharing}>
                        Share with everyone
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
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
        grid: a.gridSize || null,
    };
}

function snapGrid(v, grid) {
    return grid ? Math.round(v / grid) * grid : v;
}

function sameSelection(a, b) {
    if (a === b) return true;
    const aKeys = Object.keys(a || {});
    const bKeys = Object.keys(b || {});
    if (aKeys.length !== bKeys.length) return false;
    for (let i = 0; i < aKeys.length; i += 1) {
        const k = aKeys[i];
        if (a[k] !== b[k]) return false;
    }
    return true;
}

function sameCanvasPrefs(a, b) {
    return (
        a.gridSize === b.gridSize &&
        a.objectsSnapModeEnabled === b.objectsSnapModeEnabled &&
        a.isBindingEnabled === b.isBindingEnabled &&
        a.theme === b.theme &&
        a.displayBackgroundColor === b.displayBackgroundColor &&
        a.viewBackgroundColor === b.viewBackgroundColor
    );
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
