import React, { useState } from 'react';
import Button from '@splunk/react-ui/Button';
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Switch from '@splunk/react-ui/Switch';
import Text from '@splunk/react-ui/Text';
import { sourceLabel } from '../lib/historyStore';

function formatDate(ts) {
    if (!ts) return '';
    try {
        return new Date(ts).toLocaleString();
    } catch {
        return String(ts);
    }
}

function HistoryEntry({
    entry,
    subtitle,
    onRestore,
    onDelete,
    restoring,
}) {
    const title = entry.kind === 'snapshot'
        ? (entry.label || '(unlabeled snapshot)')
        : (entry.label || sourceLabel(entry.source));

    return (
        <div
            style={{
                border: '1px solid var(--gray60, #c3cbd4)',
                borderRadius: 4,
                padding: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
            }}
        >
            <strong style={{ fontSize: 13 }}>{title}</strong>
            <span style={{ fontSize: 12, opacity: 0.7 }}>
                {formatDate(entry.createdAt)} · {entry.elementCount} element
                {entry.elementCount !== 1 ? 's' : ''}
                {subtitle ? ` · ${subtitle}` : ''}
            </span>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <Button
                    size="small"
                    appearance="primary"
                    disabled={restoring}
                    onClick={() => onRestore(entry)}
                >
                    Restore
                </Button>
                <Button
                    size="small"
                    appearance="destructive"
                    disabled={restoring}
                    onClick={() => onDelete(entry.id)}
                >
                    Delete
                </Button>
            </div>
        </div>
    );
}

export default function HistoryPanel({
    revisions,
    snapshots,
    maxRevisions,
    maxSnapshots,
    onSnapshot,
    onRestore,
    onDeleteRevision,
    onDeleteSnapshot,
    restoring,
}) {
    const [label, setLabel] = useState('');
    const [pending, setPending] = useState(null);
    const [checkpointFirst, setCheckpointFirst] = useState(true);

    const save = async () => {
        await onSnapshot(label.trim());
        setLabel('');
    };

    const openRestore = (entry) => {
        setPending(entry);
        setCheckpointFirst(true);
    };

    const confirmRestore = async () => {
        if (!pending) return;
        const entry = pending;
        setPending(null);
        await onRestore(entry, { checkpointFirst });
    };

    const pendingTitle = pending
        ? (pending.kind === 'snapshot'
            ? (pending.label || 'Unlabeled snapshot')
            : (pending.label || sourceLabel(pending.source)))
        : '';

    return (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Heading level={3}>Version history</Heading>
            <P style={{ fontSize: 12, margin: 0, opacity: 0.8 }}>
                Automatic revisions are saved before each board write (latest {maxRevisions}).
                Named snapshots are manual checkpoints (latest {maxSnapshots}).
            </P>

            <div style={{ display: 'flex', gap: 6 }}>
                <Text
                    value={label}
                    onChange={(_, { value }) => setLabel(value)}
                    placeholder="Snapshot label (optional)"
                    style={{ flex: 1 }}
                />
                <Button appearance="primary" onClick={save} disabled={restoring}>
                    Save snapshot
                </Button>
            </div>

            <div>
                <div
                    style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        opacity: 0.6,
                        marginBottom: 8,
                    }}
                >
                    Automatic revisions ({revisions.length}/{maxRevisions})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {revisions.length === 0 && (
                        <P style={{ fontSize: 12, margin: 0, opacity: 0.7 }}>
                            No revisions yet — edit and save the board to create one.
                        </P>
                    )}
                    {revisions.map((r) => (
                        <HistoryEntry
                            key={r.id}
                            entry={r}
                            subtitle={sourceLabel(r.source)}
                            onRestore={openRestore}
                            onDelete={onDeleteRevision}
                            restoring={restoring}
                        />
                    ))}
                </div>
            </div>

            <div>
                <div
                    style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        opacity: 0.6,
                        marginBottom: 8,
                    }}
                >
                    Named snapshots ({snapshots.length}/{maxSnapshots})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {snapshots.length === 0 && (
                        <P style={{ fontSize: 12, margin: 0, opacity: 0.7 }}>
                            No named snapshots yet.
                        </P>
                    )}
                    {snapshots.map((v) => (
                        <HistoryEntry
                            key={v.id}
                            entry={v}
                            subtitle="Manual snapshot"
                            onRestore={openRestore}
                            onDelete={onDeleteSnapshot}
                            restoring={restoring}
                        />
                    ))}
                </div>
            </div>

            {pending && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1000,
                        background: 'rgba(0,0,0,0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                    }}
                    onClick={() => setPending(null)}
                >
                    <div
                        role="dialog"
                        aria-labelledby="restore-dialog-title"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'var(--color-surface, #fff)',
                            color: 'var(--color-on-background, #1b1b1b)',
                            borderRadius: 8,
                            padding: 20,
                            maxWidth: 420,
                            width: '100%',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                        }}
                    >
                        <Heading level={4} id="restore-dialog-title">
                            Restore this version?
                        </Heading>
                        <P style={{ fontSize: 13, margin: '12px 0' }}>
                            <strong>{pendingTitle}</strong>
                            <br />
                            {formatDate(pending.createdAt)} · {pending.elementCount} elements
                        </P>
                        <P style={{ fontSize: 12, margin: '0 0 12px', opacity: 0.75 }}>
                            The live canvas will be replaced. You can undo by restoring a newer
                            revision or the checkpoint created below.
                        </P>
                        <div style={{ marginBottom: 16 }}>
                            <Switch
                                value="checkpoint"
                                selected={checkpointFirst}
                                onClick={() => setCheckpointFirst((v) => !v)}
                                appearance="toggle"
                            >
                                Save current canvas as checkpoint first
                            </Switch>
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <Button onClick={() => setPending(null)}>Cancel</Button>
                            <Button appearance="primary" onClick={confirmRestore} disabled={restoring}>
                                Restore
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
