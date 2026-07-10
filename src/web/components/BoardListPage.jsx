import React, { useMemo, useState } from 'react';
import Button from '@splunk/react-ui/Button';
import Card from '@splunk/react-ui/Card';
import CardLayout from '@splunk/react-ui/CardLayout';
import Heading from '@splunk/react-ui/Heading';
import Text from '@splunk/react-ui/Text';
import P from '@splunk/react-ui/Paragraph';
import Message from '@splunk/react-ui/Message';
import Link from '@splunk/react-ui/Link';

import { useBoards, useBoardMutations } from '../hooks/useKVStore';
import { BOARD_VISIBILITY, visibilityLabel } from '../lib/boardScope';
import { buildShareLink } from '../lib/url';

function formatDate(ts) {
    if (!ts) return '';
    try {
        return new Date(ts).toLocaleString();
    } catch {
        return String(ts);
    }
}

const FILTER_ALL = 'all';
const FILTER_SHARED = 'shared';
const FILTER_PRIVATE = 'private';

function VisibilityToggle({ value, onChange }) {
    const options = [
        { value: BOARD_VISIBILITY.PRIVATE, label: 'Just me' },
        { value: BOARD_VISIBILITY.SHARED, label: 'Everyone' },
    ];
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, opacity: 0.75 }}>Visibility:</span>
            <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--gray60, #c3cbd4)' }}>
                {options.map(({ value: optValue, label }) => (
                    <button
                        key={optValue}
                        type="button"
                        onClick={() => onChange(optValue)}
                        style={{
                            all: 'unset',
                            padding: '4px 10px',
                            fontSize: 12,
                            cursor: 'pointer',
                            background: value === optValue ? 'var(--interactive-color, #5a4fcf)' : 'transparent',
                            color: value === optValue ? '#fff' : 'inherit',
                            fontWeight: value === optValue ? 600 : 400,
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function FilterTabs({ value, onChange }) {
    const tabs = [
        { value: FILTER_ALL, label: 'All' },
        { value: FILTER_SHARED, label: 'Shared' },
        { value: FILTER_PRIVATE, label: 'My private' },
    ];
    return (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tabs.map((tab) => (
                <Button
                    key={tab.value}
                    size="small"
                    appearance={value === tab.value ? 'primary' : 'default'}
                    onClick={() => onChange(tab.value)}
                >
                    {tab.label}
                </Button>
            ))}
        </div>
    );
}

export default function BoardListPage({ onOpen }) {
    const { boards, loading, error, refresh } = useBoards();
    const { createBoard, deleteBoard } = useBoardMutations();
    const [query, setQuery] = useState('');
    const [newName, setNewName] = useState('');
    const [newVisibility, setNewVisibility] = useState(BOARD_VISIBILITY.PRIVATE);
    const [filter, setFilter] = useState(FILTER_ALL);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return boards.filter((b) => {
            if (filter === FILTER_SHARED && b.visibility !== BOARD_VISIBILITY.SHARED) return false;
            if (filter === FILTER_PRIVATE && b.visibility !== BOARD_VISIBILITY.PRIVATE) return false;
            if (!q) return true;
            return b.name.toLowerCase().includes(q) || (b.tags || '').toLowerCase().includes(q);
        });
    }, [boards, query, filter]);

    const handleCreate = async () => {
        const created = await createBoard(newName.trim() || 'Untitled', '', newVisibility);
        setNewName('');
        if (created?.id) onOpen(created.id);
    };

    const handleDelete = async (board) => {
        // eslint-disable-next-line no-alert
        if (!window.confirm(`Delete board "${board.name}"? This cannot be undone.`)) return;
        await deleteBoard(board.id, board.scope);
        await refresh();
    };

    const handleCopyLink = async (board) => {
        if (board.visibility !== BOARD_VISIBILITY.SHARED) return;
        try {
            await navigator.clipboard.writeText(buildShareLink(board.id));
        } catch {
            // ignore
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
                to make it visible to everyone on this instance. Templates remain shared for all users.
            </P>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                <Text
                    value={query}
                    onChange={(_, { value }) => setQuery(value)}
                    placeholder="Search by name or tag…"
                    style={{ width: 320 }}
                />
                <FilterTabs value={filter} onChange={setFilter} />
            </div>

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
                                    gap: 8,
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Button appearance="primary" onClick={() => onOpen(b.id)}>
                                    Open
                                </Button>
                                <div style={{ display: 'flex', gap: 8 }}>
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
                                            handleDelete(b);
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
        </div>
    );
}
