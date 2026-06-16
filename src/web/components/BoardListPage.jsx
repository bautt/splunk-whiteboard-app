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
import { buildShareLink } from '../lib/url';

function formatDate(ts) {
    if (!ts) return '';
    try {
        return new Date(ts).toLocaleString();
    } catch {
        return String(ts);
    }
}

export default function BoardListPage({ onOpen }) {
    const { boards, loading, error, refresh } = useBoards();
    const { createBoard, deleteBoard } = useBoardMutations();
    const [query, setQuery] = useState('');
    const [newName, setNewName] = useState('');

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return boards;
        return boards.filter(
            (b) =>
                b.name.toLowerCase().includes(q) || (b.tags || '').toLowerCase().includes(q)
        );
    }, [boards, query]);

    const handleCreate = async () => {
        const id = await createBoard(newName.trim() || 'Untitled', '');
        setNewName('');
        if (id) onOpen(id);
    };

    const handleDelete = async (id, name) => {
        // eslint-disable-next-line no-alert
        if (!window.confirm(`Delete board "${name}"? This cannot be undone.`)) return;
        await deleteBoard(id);
        await refresh();
    };

    const handleCopyLink = async (id) => {
        try {
            await navigator.clipboard.writeText(buildShareLink(id));
        } catch {
            // ignore
        }
    };

    return (
        <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                }}
            >
                <Heading level={1}>Whiteboards</Heading>
                <div style={{ display: 'flex', gap: 8 }}>
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
            </div>

            <div style={{ marginBottom: 16 }}>
                <Text
                    value={query}
                    onChange={(_, { value }) => setQuery(value)}
                    placeholder="Search by name or tag…"
                    style={{ width: 320 }}
                />
            </div>

            {error && (
                <Message type="error">Failed to load whiteboards: {error}</Message>
            )}

            {loading ? (
                <P>Loading…</P>
            ) : filtered.length === 0 ? (
                <P>
                    No boards yet — create your first one with the form above. Boards are
                    shared with every Splunk user on this instance.
                </P>
            ) : (
                <CardLayout cardWidth={300} wrap="wrap">
                    {filtered.map((b) => (
                        <Card key={b.id} style={{ minHeight: 160 }}>
                            <Card.Header
                                title={b.name}
                                subtitle={b.owner ? `by ${b.owner}` : undefined}
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
                                    <Link
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleCopyLink(b.id);
                                        }}
                                    >
                                        Copy link
                                    </Link>
                                    <Link
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleDelete(b.id, b.name);
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
