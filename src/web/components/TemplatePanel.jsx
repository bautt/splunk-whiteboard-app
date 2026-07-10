import React, { useState } from 'react';
import Button from '@splunk/react-ui/Button';
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import { useTemplates } from '../hooks/useTemplates';
import { useTemplateRevisions } from '../hooks/useTemplateRevisions';
import { sanitizeElementsForPersistence } from '../lib/build';
import { rehydrateMissingFiles } from '../lib/boardFiles';
import PREBUILT_TEMPLATES from '../lib/prebuiltTemplates';
import {
    MAX_REVISIONS_PER_TEMPLATE,
    templateRevisionSourceLabel,
    TEMPLATE_REVISION_SOURCES,
} from '../lib/templateHistoryStore';

function formatDate(ts) {
    if (!ts) return '';
    try {
        return new Date(ts).toLocaleString();
    } catch {
        return String(ts);
    }
}

const inputStyle = {
    padding: '5px 8px',
    fontSize: 13,
    border: '1px solid var(--gray60, #c3cbd4)',
    borderRadius: 4,
    outline: 'none',
    background: 'var(--gray99, #fff)',
    color: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
};

function TemplateForm({ title, submitLabel, initialName = '', initialDesc = '', onSubmit, onCancel }) {
    const [name, setName] = useState(initialName);
    const [desc, setDesc] = useState(initialDesc);
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            await onSubmit({ name, description: desc });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            style={{
                border: '2px solid #5a4fcf',
                borderRadius: 8,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                background: 'var(--gray98, #fafbfc)',
            }}
        >
            <strong style={{ fontSize: 13 }}>{title}</strong>
            <input
                autoFocus
                placeholder="Template name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                style={inputStyle}
            />
            <input
                placeholder="Description (optional)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 6 }}>
                <Button
                    appearance="primary"
                    size="small"
                    disabled={!name.trim() || saving}
                    onClick={submit}
                >
                    {saving ? 'Saving…' : submitLabel}
                </Button>
                <Button size="small" onClick={onCancel}>Cancel</Button>
            </div>
        </div>
    );
}

function TemplateHistory({ templateId, onRestore, onDeleteRevision, restoring }) {
    const { revisions, loading, deleteRevision } = useTemplateRevisions(templateId);

    return (
        <div
            style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop: '1px solid var(--gray80, #d5dbe0)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
            }}
        >
            <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.65 }}>
                Version history ({revisions.length}/{MAX_REVISIONS_PER_TEMPLATE})
            </div>
            <P style={{ fontSize: 11, margin: 0, opacity: 0.65 }}>
                A revision is saved automatically before each template update.
            </P>
            {loading && (
                <P style={{ fontSize: 11, margin: 0, opacity: 0.7 }}>Loading history…</P>
            )}
            {!loading && revisions.length === 0 && (
                <P style={{ fontSize: 11, margin: 0, opacity: 0.7 }}>
                    No revisions yet — update the template to create one.
                </P>
            )}
            {!loading && revisions.map((rev) => (
                <div
                    key={rev.id}
                    style={{
                        border: '1px solid var(--gray70, #b8c0c8)',
                        borderRadius: 4,
                        padding: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                    }}
                >
                    <strong style={{ fontSize: 12 }}>
                        {rev.label || templateRevisionSourceLabel(rev.source)}
                    </strong>
                    <span style={{ fontSize: 11, opacity: 0.7 }}>
                        {formatDate(rev.createdAt)} · {rev.elementCount} element
                        {rev.elementCount !== 1 ? 's' : ''}
                        {rev.createdBy ? ` · ${rev.createdBy}` : ''}
                    </span>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <Button
                            size="small"
                            appearance="primary"
                            disabled={restoring}
                            onClick={() => onRestore(rev)}
                        >
                            Restore
                        </Button>
                        <Button
                            size="small"
                            appearance="destructive"
                            disabled={restoring}
                            onClick={() => onDeleteRevision(rev.id, deleteRevision)}
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}

function PrebuiltTemplateCard({ tpl, onReplace }) {
    return (
        <div
            style={{
                border: '1px solid var(--gray60, #c3cbd4)',
                borderRadius: 6,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                background: 'var(--gray98, #fafbfc)',
            }}
        >
            <div>
                <strong style={{ fontSize: 13, display: 'block' }}>{tpl.label}</strong>
                {tpl.description && (
                    <span style={{ fontSize: 11, opacity: 0.7, display: 'block', marginTop: 2 }}>
                        {tpl.description}
                    </span>
                )}
            </div>
            <Button appearance="primary" size="small" onClick={onReplace} title="Replace the current board with this template">
                Replace board
            </Button>
        </div>
    );
}

function TemplateCard({ tpl, onReplace, onUpdate, onDelete, onRestoreRevision, restoring }) {
    const [confirming, setConfirming] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const { name, description } = tpl;

    return (
        <div
            style={{
                border: '1px solid var(--gray60, #c3cbd4)',
                borderRadius: 6,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: 13, display: 'block' }}>{name}</strong>
                    {description && (
                        <span style={{ fontSize: 11, opacity: 0.7, display: 'block', marginTop: 2 }}>
                            {description}
                        </span>
                    )}
                </div>
                {confirming ? (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button
                            type="button"
                            onClick={onDelete}
                            style={{
                                all: 'unset', cursor: 'pointer', fontSize: 11,
                                color: '#fff', background: '#dc2626',
                                padding: '2px 6px', borderRadius: 4,
                            }}
                        >
                            Delete
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirming(false)}
                            style={{
                                all: 'unset', cursor: 'pointer', fontSize: 11,
                                color: 'inherit', background: 'var(--gray90, #e2e6ea)',
                                padding: '2px 6px', borderRadius: 4,
                            }}
                        >
                            Keep
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setConfirming(true)}
                        title="Delete template"
                        style={{
                            all: 'unset', cursor: 'pointer', flexShrink: 0,
                            color: 'var(--gray40, #888)', fontSize: 14, lineHeight: 1,
                            padding: '0 2px',
                        }}
                    >
                        🗑
                    </button>
                )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Button appearance="primary" size="small" onClick={onReplace} title="Replace the current board with this template">
                    Replace board
                </Button>
                <Button appearance="secondary" size="small" onClick={onUpdate}>
                    Update
                </Button>
                <Button
                    appearance="flat"
                    size="small"
                    onClick={() => setShowHistory((v) => !v)}
                >
                    {showHistory ? 'Hide history' : 'History'}
                </Button>
            </div>
            {showHistory && (
                <TemplateHistory
                    templateId={tpl._key}
                    onRestore={(rev) => onRestoreRevision(tpl, rev)}
                    onDeleteRevision={async (id, deleteRevision) => {
                        if (!window.confirm('Delete this template revision?')) return;
                        await deleteRevision(id);
                    }}
                    restoring={restoring}
                />
            )}
        </div>
    );
}

export default function TemplatePanel({ onApply, getElementsAndState }) {
    const { templates, loading, saveTemplate, updateTemplate, deleteTemplate } = useTemplates();
    const [showSaveForm, setShowSaveForm] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [restoring, setRestoring] = useState(false);

    const boardSnapshot = () => {
        if (!getElementsAndState) return null;
        const { elements, files, appState } = getElementsAndState();
        const sanitized = sanitizeElementsForPersistence(elements);
        const fileArr = rehydrateMissingFiles(sanitized, Object.values(files || {}));
        return { elements: sanitized, files: fileArr, appState: appState || {} };
    };

    const replaceWithPrebuilt = (tpl) => {
        if (!window.confirm(`Replace the current board with "${tpl.label}"? Unsaved changes will be lost.`)) return;
        try {
            const files = rehydrateMissingFiles(tpl.elements, tpl.files);
            onApply(tpl.elements, files, tpl.appState || null);
        } catch (e) {
            window.alert('Failed to load template: ' + e.message);
        }
    };

    const replaceWithCustom = (tpl) => {
        if (!window.confirm(`Replace the current board with the "${tpl.name}" template? Unsaved changes will be lost.`)) return;
        try {
            const elements = sanitizeElementsForPersistence(
                JSON.parse(tpl.elements_json || '[]')
            );
            const storedFiles = JSON.parse(tpl.files_json || '[]');
            const files = rehydrateMissingFiles(elements, storedFiles);
            let appState = null;
            try {
                appState = JSON.parse(tpl.appstate_json || 'null');
            } catch {
                appState = null;
            }
            onApply(elements, files, appState);
        } catch (e) {
            window.alert('Failed to load template: ' + e.message);
        }
    };

    const handleSave = async ({ name, description }) => {
        const snapshot = boardSnapshot();
        if (!snapshot) return;
        await saveTemplate({ name, description, ...snapshot });
        setShowSaveForm(false);
    };

    const handleUpdate = async ({ name, description }) => {
        if (!editingTemplate) return;
        const snapshot = boardSnapshot();
        if (!snapshot) return;
        if (
            !window.confirm(
                `Update template "${editingTemplate.name}" with the current board (name, description, and canvas content)?`
            )
        ) {
            return;
        }
        try {
            await updateTemplate(editingTemplate._key, { name, description, ...snapshot });
            setEditingTemplate(null);
        } catch (e) {
            window.alert('Failed to update template: ' + e.message);
        }
    };

    const handleRestoreRevision = async (tpl, revision) => {
        if (
            !window.confirm(
                `Restore template "${tpl.name}" to the version from ${formatDate(revision.createdAt)}? The current template content will be saved as a revision first.`
            )
        ) {
            return;
        }
        setRestoring(true);
        try {
            await updateTemplate(
                tpl._key,
                {
                    name: revision.name,
                    description: revision.description,
                    elements: revision.elements,
                    files: revision.files,
                    appState: revision.appState || {},
                },
                { revisionSource: TEMPLATE_REVISION_SOURCES.PRE_RESTORE }
            );
        } catch (e) {
            window.alert('Failed to restore template revision: ' + e.message);
        } finally {
            setRestoring(false);
        }
    };

    const closeForms = () => {
        setShowSaveForm(false);
        setEditingTemplate(null);
    };

    return (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Heading level={3}>Templates</Heading>
            <P style={{ fontSize: 12, margin: 0, opacity: 0.75 }}>
                Start from a built-in example, save boards you reuse as templates, or update them
                from the current canvas. Replace board loads a template onto the canvas and
                discards unsaved changes. Each update keeps the last{' '}
                {MAX_REVISIONS_PER_TEMPLATE} versions automatically.
            </P>

            <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', opacity: 0.6, marginBottom: 8 }}>
                    Examples ({PREBUILT_TEMPLATES.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {PREBUILT_TEMPLATES.map((tpl) => (
                        <PrebuiltTemplateCard
                            key={tpl.id}
                            tpl={tpl}
                            onReplace={() => replaceWithPrebuilt(tpl)}
                        />
                    ))}
                </div>
            </div>

            {editingTemplate ? (
                <TemplateForm
                    title={`Update template: ${editingTemplate.name}`}
                    submitLabel="Update template"
                    initialName={editingTemplate.name}
                    initialDesc={editingTemplate.description || ''}
                    onSubmit={handleUpdate}
                    onCancel={closeForms}
                />
            ) : showSaveForm ? (
                <TemplateForm
                    title="Save current board as template"
                    submitLabel="Save template"
                    onSubmit={handleSave}
                    onCancel={closeForms}
                />
            ) : (
                <Button
                    appearance="secondary"
                    onClick={() => setShowSaveForm(true)}
                    disabled={!getElementsAndState}
                >
                    Save current board as template
                </Button>
            )}

            {loading && (
                <P style={{ fontSize: 12, margin: 0, opacity: 0.7 }}>Loading templates…</P>
            )}

            {!loading && templates.length === 0 && (
                <P style={{ fontSize: 12, margin: 0, opacity: 0.7 }}>
                    No saved templates yet.
                </P>
            )}

            {!loading && templates.length > 0 && (
                <>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', opacity: 0.6 }}>
                        Saved templates ({templates.length})
                    </div>
                    {templates.map((tpl) => (
                        <TemplateCard
                            key={tpl._key}
                            tpl={tpl}
                            onReplace={() => replaceWithCustom(tpl)}
                            onUpdate={() => {
                                setShowSaveForm(false);
                                setEditingTemplate(tpl);
                            }}
                            onDelete={() => deleteTemplate(tpl._key)}
                            onRestoreRevision={handleRestoreRevision}
                            restoring={restoring}
                        />
                    ))}
                </>
            )}
        </div>
    );
}
