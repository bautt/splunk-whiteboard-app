import React, { useState } from 'react';
import Button from '@splunk/react-ui/Button';
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import { TEMPLATES } from '../templates';
import { useTemplates } from '../hooks/useTemplates';

// ── Save-as-template form ──────────────────────────────────────────────────
function SaveForm({ onSave, onCancel }) {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!name.trim()) return;
        setSaving(true);
        await onSave({ name, description: desc });
        setSaving(false);
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
            <strong style={{ fontSize: 13 }}>Save current board as template</strong>
            <input
                autoFocus
                placeholder="Template name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                style={{
                    padding: '5px 8px', fontSize: 13,
                    border: '1px solid var(--gray60, #c3cbd4)', borderRadius: 4,
                    outline: 'none', background: 'var(--gray99, #fff)', color: 'inherit',
                    width: '100%', boxSizing: 'border-box',
                }}
            />
            <input
                placeholder="Description (optional)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                style={{
                    padding: '5px 8px', fontSize: 13,
                    border: '1px solid var(--gray60, #c3cbd4)', borderRadius: 4,
                    outline: 'none', background: 'var(--gray99, #fff)', color: 'inherit',
                    width: '100%', boxSizing: 'border-box',
                }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
                <Button
                    appearance="primary"
                    size="small"
                    disabled={!name.trim() || saving}
                    onClick={submit}
                >
                    {saving ? 'Saving…' : 'Save template'}
                </Button>
                <Button size="small" onClick={onCancel}>Cancel</Button>
            </div>
        </div>
    );
}

// ── Template card ──────────────────────────────────────────────────────────
function TemplateCard({ name, description, onApply, onDelete, isBuiltin }) {
    const [confirming, setConfirming] = useState(false);

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
                {!isBuiltin && (
                    confirming ? (
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button
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
                    )
                )}
            </div>
            <Button appearance="primary" size="small" onClick={onApply}>
                Apply
            </Button>
        </div>
    );
}

// ── Main panel ─────────────────────────────────────────────────────────────
export default function TemplatePanel({ onApply, getElementsAndState }) {
    const { templates, loading, saveTemplate, deleteTemplate } = useTemplates();
    const [showSaveForm, setShowSaveForm] = useState(false);

    const applyBuiltin = (tpl) => {
        if (!window.confirm(`Replace the current board with the "${tpl.name}" template?`)) return;
        const result = tpl.build();
        if (Array.isArray(result)) {
            onApply(result, []);
        } else {
            onApply(result.elements, result.files || []);
        }
    };

    const applyCustom = (tpl) => {
        if (!window.confirm(`Replace the current board with the "${tpl.name}" template?`)) return;
        try {
            const elements = JSON.parse(tpl.elements_json || '[]');
            const files = JSON.parse(tpl.files_json || '[]');
            onApply(elements, files);
        } catch (e) {
            window.alert('Failed to load template: ' + e.message);
        }
    };

    const handleSave = async ({ name, description }) => {
        if (!getElementsAndState) return;
        const { elements, appState, files } = getElementsAndState();
        // Convert Excalidraw BinaryFiles map to an array for storage
        const fileArr = Object.values(files || {});
        await saveTemplate({ name, description, elements, files: fileArr });
        setShowSaveForm(false);
    };

    return (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Heading level={3}>Templates</Heading>

            {/* Save-as-template button / form */}
            {showSaveForm ? (
                <SaveForm onSave={handleSave} onCancel={() => setShowSaveForm(false)} />
            ) : (
                <Button
                    appearance="secondary"
                    icon={<span>💾</span>}
                    onClick={() => setShowSaveForm(true)}
                    disabled={!getElementsAndState}
                >
                    Save current board as template
                </Button>
            )}

            {/* User templates */}
            {!loading && templates.length > 0 && (
                <>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', opacity: 0.6 }}>
                        My Templates ({templates.length})
                    </div>
                    {templates.map((tpl) => (
                        <TemplateCard
                            key={tpl._key}
                            name={tpl.name}
                            description={tpl.description}
                            isBuiltin={false}
                            onApply={() => applyCustom(tpl)}
                            onDelete={() => deleteTemplate(tpl._key)}
                        />
                    ))}
                </>
            )}

            {/* Divider */}
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', opacity: 0.6 }}>
                Built-in Templates
            </div>
            <P style={{ fontSize: 11, margin: 0, opacity: 0.7 }}>
                Replaces the current canvas — save your work first.
            </P>

            {/* Built-in templates */}
            {TEMPLATES.map((tpl) => (
                <TemplateCard
                    key={tpl.id}
                    name={tpl.name}
                    description={tpl.description}
                    isBuiltin
                    onApply={() => applyBuiltin(tpl)}
                />
            ))}
        </div>
    );
}
