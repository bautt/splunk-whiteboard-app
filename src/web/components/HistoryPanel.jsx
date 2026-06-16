import React, { useState } from 'react';
import Button from '@splunk/react-ui/Button';
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Text from '@splunk/react-ui/Text';

function formatDate(ts) {
    if (!ts) return '';
    try {
        return new Date(ts).toLocaleString();
    } catch {
        return String(ts);
    }
}

export default function HistoryPanel({ versions, onSnapshot, onRestore, onDelete }) {
    const [label, setLabel] = useState('');

    const save = async () => {
        await onSnapshot(label.trim());
        setLabel('');
    };

    return (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Heading level={3}>Version history</Heading>
            <P>
                Snapshots capture the canvas state. The latest {versions.length}/20 are kept.
            </P>
            <div style={{ display: 'flex', gap: 6 }}>
                <Text
                    value={label}
                    onChange={(_, { value }) => setLabel(value)}
                    placeholder="Label (optional)"
                    style={{ flex: 1 }}
                />
                <Button appearance="primary" onClick={save}>
                    Save snapshot
                </Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {versions.length === 0 && <P>No snapshots yet.</P>}
                {versions.map((v) => (
                    <div
                        key={v.id}
                        style={{
                            border: '1px solid var(--gray60, #c3cbd4)',
                            borderRadius: 4,
                            padding: 10,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                        }}
                    >
                        <strong>{v.label || '(unlabeled)'}</strong>
                        <span style={{ fontSize: 12, opacity: 0.7 }}>
                            {formatDate(v.createdAt)} · {v.elements.length} elements
                        </span>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            <Button size="small" appearance="primary" onClick={() => onRestore(v)}>
                                Restore
                            </Button>
                            <Button size="small" appearance="destructive" onClick={() => onDelete(v.id)}>
                                Delete
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
