import React, { useEffect, useMemo, useRef, useState } from 'react';
import Button from '@splunk/react-ui/Button';
import Card from '@splunk/react-ui/Card';
import CardLayout from '@splunk/react-ui/CardLayout';
import Heading from '@splunk/react-ui/Heading';
import Text from '@splunk/react-ui/Text';
import P from '@splunk/react-ui/Paragraph';
import Message from '@splunk/react-ui/Message';
import Link from '@splunk/react-ui/Link';
import Modal from '@splunk/react-ui/Modal';
import RadioBar from '@splunk/react-ui/RadioBar';
import TabBar from '@splunk/react-ui/TabBar';
import ControlGroup from '@splunk/react-ui/ControlGroup';

import { useBoards, useBoardMutations } from '../hooks/useKVStore';
import { BOARD_VISIBILITY, visibilityLabel } from '../lib/boardScope';
import { buildShareLink } from '../lib/url';
import { buildBoardBundle, parseBoardImport } from '../lib/boardBundle';
import { buildBoardsZipBlob } from '../lib/exportBoardZip';
import { APP_VERSION } from '../lib/version';
import { generateThumbnailDataUrl, boardHasContent } from '../lib/thumbnail';
import { getThumbnail, saveThumbnail } from '../lib/thumbnailStore';
import EXAMPLE_BOARDS from '../lib/exampleBoards';
import { migrateTemplatesToBoards } from '../lib/migrateTemplates';
import { rehydrateMissingFiles } from '../lib/boardFiles';

function formatDate(ts) {
    if (!ts) return '';
    try {
        return new Date(ts).toLocaleString();
    } catch {
        return String(ts);
    }
}

function safeFileName(name) {
    return (name || 'whiteboard').replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

function downloadJson(obj, fileName) {
    downloadBlob(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }), fileName);
}

const FILTER_ALL = 'all';
const FILTER_SHARED = 'shared';
const FILTER_PRIVATE = 'private';

const THUMB_HEIGHT = 150;

const thumbFrameStyle = {
    height: THUMB_HEIGHT,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    background: 'rgba(127, 127, 127, 0.10)',
    borderBottom: '1px solid rgba(127, 127, 127, 0.2)',
};

// Fixed-aspect board preview. Prefers the stored thumbnail; if none exists and
// the board has content, it renders one on the fly and backfills the store so
// the next visit is instant. Rendering is deferred until the card scrolls near
// the viewport to keep large lists responsive.
function BoardThumbnail({ board }) {
    const [src, setSrc] = useState(null);
    // status: loading | ready | empty | error
    const [status, setStatus] = useState('loading');
    const [visible, setVisible] = useState(false);
    const frameRef = useRef(null);

    useEffect(() => {
        if (visible) return undefined;
        const el = frameRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') {
            setVisible(true);
            return undefined;
        }
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setVisible(true);
                    io.disconnect();
                }
            },
            { rootMargin: '250px' }
        );
        io.observe(el);
        return () => io.disconnect();
    }, [visible]);

    useEffect(() => {
        if (!visible) return undefined;
        let cancelled = false;
        setStatus('loading');
        setSrc(null);
        (async () => {
            const stored = await getThumbnail(board.id);
            if (cancelled) return;
            if (stored) {
                setSrc(stored);
                setStatus('ready');
                return;
            }
            if (!boardHasContent(board.elements)) {
                setStatus('empty');
                return;
            }
            try {
                const image = await generateThumbnailDataUrl({
                    elements: board.elements,
                    appState: board.appState,
                    files: board.files,
                });
                if (cancelled) return;
                if (image) {
                    setSrc(image);
                    setStatus('ready');
                    saveThumbnail(board.id, image);
                } else {
                    setStatus('empty');
                }
            } catch {
                if (!cancelled) setStatus('error');
            }
        })();
        return () => {
            cancelled = true;
        };
        // Regenerate when the board's content changes (updatedAt) or scope flips.
    }, [visible, board.id, board.updatedAt]);

    return (
        <div ref={frameRef} style={thumbFrameStyle}>
            {status === 'ready' && src ? (
                <img
                    src={src}
                    alt=""
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
            ) : (
                <span style={{ fontSize: 12, opacity: 0.5 }}>
                    {status === 'loading' ? 'Loading preview…' : 'No preview'}
                </span>
            )}
        </div>
    );
}

// Preview for an in-bundle example board. Example boards are not in KV, so the
// thumbnail is rendered on the fly and not persisted.
function ExampleThumbnail({ example }) {
    const [src, setSrc] = useState(null);
    const [status, setStatus] = useState('loading');
    const frameRef = useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (visible) return undefined;
        const el = frameRef.current;
        if (!el || typeof IntersectionObserver === 'undefined') {
            setVisible(true);
            return undefined;
        }
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setVisible(true);
                    io.disconnect();
                }
            },
            { rootMargin: '250px' }
        );
        io.observe(el);
        return () => io.disconnect();
    }, [visible]);

    useEffect(() => {
        if (!visible) return undefined;
        let cancelled = false;
        setStatus('loading');
        (async () => {
            try {
                const image = await generateThumbnailDataUrl({
                    elements: example.elements,
                    appState: example.appState || {},
                    files: rehydrateMissingFiles(example.elements, example.files),
                });
                if (cancelled) return;
                if (image) {
                    setSrc(image);
                    setStatus('ready');
                } else {
                    setStatus('empty');
                }
            } catch {
                if (!cancelled) setStatus('error');
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [visible, example.id]);

    return (
        <div ref={frameRef} style={thumbFrameStyle}>
            {status === 'ready' && src ? (
                <img
                    src={src}
                    alt=""
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
            ) : (
                <span style={{ fontSize: 12, opacity: 0.5 }}>
                    {status === 'loading' ? 'Loading preview…' : 'No preview'}
                </span>
            )}
        </div>
    );
}

function VisibilityToggle({ value, onChange }) {
    return (
        <ControlGroup label="Visibility" labelPosition="left" style={{ marginBottom: 0 }}>
            <RadioBar value={value} onChange={(_, { value: v }) => onChange(v)}>
                <RadioBar.Option value={BOARD_VISIBILITY.PRIVATE} label="Just me" />
                <RadioBar.Option value={BOARD_VISIBILITY.SHARED} label="Everyone" />
            </RadioBar>
        </ControlGroup>
    );
}

function FilterTabs({ value, onChange }) {
    return (
        <TabBar activeTabId={value} onChange={(_, { selectedTabId }) => onChange(selectedTabId)}>
            <TabBar.Tab label="All" tabId={FILTER_ALL} />
            <TabBar.Tab label="Shared" tabId={FILTER_SHARED} />
            <TabBar.Tab label="My private" tabId={FILTER_PRIVATE} />
        </TabBar>
    );
}

export default function BoardListPage({ onOpen }) {
    const { boards, loading, error, refresh } = useBoards();
    const { createBoard, importBoard, deleteBoard } = useBoardMutations();
    const [query, setQuery] = useState('');
    const [newName, setNewName] = useState('');
    const [newVisibility, setNewVisibility] = useState(BOARD_VISIBILITY.PRIVATE);
    const [filter, setFilter] = useState(FILTER_ALL);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [notice, setNotice] = useState(null);
    const [importing, setImporting] = useState(false);
    const importInputRef = useRef(null);
    const migratedRef = useRef(false);

    // One-time migration of legacy user templates into shared boards.
    useEffect(() => {
        if (migratedRef.current) return;
        migratedRef.current = true;
        (async () => {
            try {
                const count = await migrateTemplatesToBoards();
                if (count > 0) {
                    await refresh();
                    setNotice({
                        type: 'success',
                        text: `Migrated ${count} saved template${count !== 1 ? 's' : ''} to shared board${count !== 1 ? 's' : ''}.`,
                    });
                }
            } catch {
                // Non-fatal: templates simply remain until a later attempt.
            }
        })();
    }, [refresh]);

    const filteredExamples = useMemo(() => {
        if (filter === FILTER_PRIVATE || filter === FILTER_SHARED) return [];
        const q = query.trim().toLowerCase();
        if (!q) return EXAMPLE_BOARDS;
        return EXAMPLE_BOARDS.filter(
            (s) =>
                s.label.toLowerCase().includes(q) ||
                (s.description || '').toLowerCase().includes(q)
        );
    }, [query, filter]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const matches = boards.filter((b) => {
            if (filter === FILTER_SHARED && b.visibility !== BOARD_VISIBILITY.SHARED) return false;
            if (filter === FILTER_PRIVATE && b.visibility !== BOARD_VISIBILITY.PRIVATE) return false;
            if (!q) return true;
            return b.name.toLowerCase().includes(q) || (b.tags || '').toLowerCase().includes(q);
        });
        // Your own (private) boards first, then shared boards; newest-first within
        // each group. Keeps user-created work above shipped/shared content.
        const rank = (b) => (b.visibility === BOARD_VISIBILITY.PRIVATE ? 0 : 1);
        return matches.sort((a, b) => rank(a) - rank(b) || b.updatedAt - a.updatedAt);
    }, [boards, query, filter]);

    const handleCreate = async () => {
        const created = await createBoard(newName.trim() || 'Untitled', '', newVisibility);
        setNewName('');
        if (created?.id) onOpen(created.id);
    };

    // Clone an example board into a fresh private board, then open it. Keeps the
    // shipped example immutable so app upgrades never overwrite user work.
    const handleUseExample = async (example) => {
        try {
            const created = await importBoard({
                name: example.label,
                elements: example.elements,
                appState: example.appState || {},
                files: rehydrateMissingFiles(example.elements, example.files),
                visibility: BOARD_VISIBILITY.PRIVATE,
            });
            if (created?.id) onOpen(created.id);
        } catch (e) {
            setNotice({ type: 'error', text: `Could not create board: ${e.message}` });
        }
    };

    const handleDuplicate = async (board) => {
        try {
            await importBoard({
                name: `${board.name} (copy)`,
                tags: board.tags || '',
                elements: board.elements,
                appState: board.appState || {},
                files: board.files,
                visibility: BOARD_VISIBILITY.PRIVATE,
            });
            await refresh();
            setNotice({
                type: 'success',
                text: `Duplicated "${board.name}" as a private board.`,
            });
        } catch (e) {
            setNotice({ type: 'error', text: `Duplicate failed: ${e.message}` });
        }
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        setDeleting(true);
        try {
            await deleteBoard(pendingDelete.id, pendingDelete.scope);
            await refresh();
        } finally {
            setDeleting(false);
            setPendingDelete(null);
        }
    };

    const handleCopyLink = async (board) => {
        if (board.visibility !== BOARD_VISIBILITY.SHARED) return;
        try {
            await navigator.clipboard.writeText(buildShareLink(board.id));
        } catch {
            // ignore
        }
    };

    const handleExportBoard = (board) => {
        try {
            const bundle = buildBoardBundle({
                name: board.name,
                elements: board.elements,
                appState: board.appState,
                files: board.files,
                appVersion: APP_VERSION,
            });
            downloadJson(bundle, `${safeFileName(board.name)}.whiteboard.json`);
        } catch (e) {
            setNotice({ type: 'error', text: `Export failed: ${e.message}` });
        }
    };

    const handleExportAll = () => {
        if (!boards.length) return;
        try {
            const stamp = new Date().toISOString().slice(0, 10);
            const zipBlob = buildBoardsZipBlob(boards, APP_VERSION);
            downloadBlob(zipBlob, `whiteboards-export-${stamp}.zip`);
            setNotice({
                type: 'success',
                text: `Exported ${boards.length} board${boards.length !== 1 ? 's' : ''} as individual JSON files in a ZIP.`,
            });
        } catch (e) {
            setNotice({ type: 'error', text: `Export failed: ${e.message}` });
        }
    };

    const triggerImport = () => importInputRef.current?.click();

    const handleImportFiles = async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (!files.length) return;
        setImporting(true);
        setNotice(null);
        let imported = 0;
        try {
            for (const file of files) {
                // eslint-disable-next-line no-await-in-loop
                const text = await file.text();
                const parsedBoards = parseBoardImport(text);
                const fallbackName = file.name.replace(/\.whiteboard\.json$|\.json$/i, '');
                for (const parsed of parsedBoards) {
                    // eslint-disable-next-line no-await-in-loop
                    await importBoard({
                        name: parsed.name || fallbackName || 'Imported board',
                        elements: parsed.elements,
                        appState: parsed.appState,
                        files: parsed.files,
                        visibility: BOARD_VISIBILITY.PRIVATE,
                    });
                    imported += 1;
                }
            }
            await refresh();
            setNotice({
                type: 'success',
                text: `Imported ${imported} board${imported !== 1 ? 's' : ''} as private.`,
            });
        } catch (err) {
            setNotice({
                type: 'error',
                text: `Import failed: ${err.message}`
                    + (imported ? ` (${imported} board(s) imported before the error).` : ''),
            });
            await refresh();
        } finally {
            setImporting(false);
        }
    };

    const boardSubtitle = (board) => {
        const parts = [];
        if (board.owner) parts.push(`by ${board.owner}`);
        parts.push(visibilityLabel(board.visibility));
        return parts.join(' · ');
    };

    return (
        <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 16,
                    marginBottom: 16,
                    flexWrap: 'wrap',
                }}
            >
                <Heading level={1}>Whiteboards</Heading>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <Text
                            value={newName}
                            onChange={(_, { value }) => setNewName(value)}
                            placeholder="New board name"
                            style={{ width: 240 }}
                        />
                        <Button appearance="primary" onClick={handleCreate}>
                            Create board
                        </Button>
                    </div>
                    <VisibilityToggle value={newVisibility} onChange={setNewVisibility} />
                </div>
            </div>

            <P style={{ marginTop: 0, marginBottom: 16, opacity: 0.75 }}>
                New boards default to <strong>Just me</strong> (private). Share a board from the canvas
                to make it visible to everyone on this instance. Start from an <strong>example board</strong>
                {' '}at the bottom, or <strong>Duplicate</strong> any board to make your own editable copy.
            </P>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                <Text
                    value={query}
                    onChange={(_, { value }) => setQuery(value)}
                    placeholder="Search by name or tag…"
                    style={{ width: 320 }}
                />
                <FilterTabs value={filter} onChange={setFilter} />
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <Button onClick={triggerImport} disabled={importing}>
                        {importing ? 'Importing…' : 'Import board…'}
                    </Button>
                    <Button onClick={handleExportAll} disabled={boards.length === 0}>
                        Export all
                    </Button>
                </div>
                <input
                    ref={importInputRef}
                    type="file"
                    accept=".json,application/json"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleImportFiles}
                />
            </div>

            {notice && (
                <Message
                    type={notice.type}
                    onRequestRemove={() => setNotice(null)}
                    style={{ marginBottom: 16 }}
                >
                    {notice.text}
                </Message>
            )}

            {error && (
                <Message type="error">Failed to load whiteboards: {error}</Message>
            )}

            {loading ? (
                <P>Loading…</P>
            ) : filtered.length === 0 ? (
                <P>
                    No boards match this view — create one above. Private boards are visible only to you;
                    shared boards are visible to everyone with access to this app.
                </P>
            ) : (
                <CardLayout cardWidth={300} wrap="wrap">
                    {filtered.map((b) => (
                        <Card key={`${b.scope}:${b.id}`} style={{ minHeight: 160 }}>
                            <BoardThumbnail board={b} />
                            <Card.Header
                                title={b.name}
                                subtitle={boardSubtitle(b)}
                            />
                            <Card.Body>
                                <P>Updated {formatDate(b.updatedAt)}</P>
                                {b.tags && (
                                    <P>
                                        <strong>Tags:</strong> {b.tags}
                                    </P>
                                )}
                            </Card.Body>
                            <Card.Footer
                                showBorder
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 10,
                                    alignItems: 'stretch',
                                }}
                            >
                                <Button appearance="primary" onClick={() => onOpen(b.id)}>
                                    Open
                                </Button>
                                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                    <Link
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleDuplicate(b);
                                        }}
                                    >
                                        Duplicate
                                    </Link>
                                    <Link
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleExportBoard(b);
                                        }}
                                    >
                                        Export
                                    </Link>
                                    {b.visibility === BOARD_VISIBILITY.SHARED && (
                                        <Link
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleCopyLink(b);
                                            }}
                                        >
                                            Copy link
                                        </Link>
                                    )}
                                    <Link
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setPendingDelete(b);
                                        }}
                                    >
                                        Delete
                                    </Link>
                                </div>
                            </Card.Footer>
                        </Card>
                    ))}
                </CardLayout>
            )}

            {filteredExamples.length > 0 && (
                <div style={{ marginTop: 40 }}>
                    <Heading level={2} style={{ marginBottom: 4 }}>
                        Example boards
                    </Heading>
                    <P style={{ marginTop: 0, marginBottom: 12, opacity: 0.7 }}>
                        Pre-built example whiteboards.
                    </P>
                    <CardLayout cardWidth={300} wrap="wrap">
                        {filteredExamples.map((ex) => (
                            <Card key={ex.id} style={{ minHeight: 160 }}>
                                <ExampleThumbnail example={ex} />
                                <Card.Header title={ex.label} subtitle="Example board" />
                                <Card.Body>
                                    {ex.description && <P>{ex.description}</P>}
                                </Card.Body>
                                <Card.Footer showBorder>
                                    <Button
                                        appearance="primary"
                                        onClick={() => handleUseExample(ex)}
                                    >
                                        Use
                                    </Button>
                                </Card.Footer>
                            </Card>
                        ))}
                    </CardLayout>
                </div>
            )}

            <Modal
                open={Boolean(pendingDelete)}
                onRequestClose={() => (deleting ? null : setPendingDelete(null))}
                returnFocus={() => {}}
                style={{ width: 440 }}
            >
                <Modal.Header
                    title="Delete board?"
                    onRequestClose={() => (deleting ? null : setPendingDelete(null))}
                />
                <Modal.Body>
                    <P>
                        Delete <strong>{pendingDelete?.name}</strong>? This permanently removes the
                        board and its version history and cannot be undone.
                    </P>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        appearance="secondary"
                        onClick={() => setPendingDelete(null)}
                        disabled={deleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        appearance="destructive"
                        onClick={confirmDelete}
                        disabled={deleting}
                    >
                        {deleting ? 'Deleting…' : 'Delete board'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
