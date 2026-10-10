import React, { useMemo } from 'react';
import Button from '@splunk/react-ui/Button';

/**
 * Detail panel for annotated nodes.
 *
 * Generated boards may tag elements with `customData.cdf` = { key, layer,
 * title, description, href }. Selecting any part of such a node — card, label
 * or icon, all of which share a key — shows its copy here. This replaces
 * Excalidraw's native `link` field, whose badge is painted onto the canvas for
 * every linked element and swamps a dense board.
 */
export default function NodeDetailPanel({ api, selectedIds }) {
    const detail = useMemo(() => {
        if (!api) return null;
        const sel = selectedIds || {};
        if (!Object.keys(sel).some((id) => sel[id])) return null;

        const picked = new Map();
        (api.getSceneElements() || []).forEach((el) => {
            if (!sel[el.id] || el.isDeleted) return;
            const cdf = (el.customData || {}).cdf;
            if (cdf && cdf.key && !picked.has(cdf.key)) picked.set(cdf.key, cdf);
        });
        // A marquee across several nodes has no single subject — stay quiet.
        return picked.size === 1 ? [...picked.values()][0] : null;
    }, [api, selectedIds]);

    if (!detail) return null;

    const dismiss = () => {
        if (api) api.updateScene({ appState: { selectedElementIds: {} } });
    };

    return (
        <div
            style={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 300,
                maxHeight: 'calc(100% - 140px)',
                overflowY: 'auto',
                zIndex: 20,
                background: 'var(--color-surface, #fff)',
                border: '1px solid var(--gray60, #c3cbd4)',
                borderRadius: 10,
                padding: '14px 16px',
                boxShadow: '0 4px 18px rgba(0,0,0,0.22)',
                pointerEvents: 'all',
                color: 'var(--color-on-background, #1b1b1b)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    {detail.layer && (
                        <div
                            style={{
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.07em',
                                opacity: 0.55,
                                marginBottom: 4,
                            }}
                        >
                            {detail.layer}
                        </div>
                    )}
                    <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
                        {detail.title || detail.key}
                    </div>
                </div>
                <Button
                    inline
                    appearance="subtle"
                    size="small"
                    onClick={dismiss}
                    label="Close details"
                >
                    ✕
                </Button>
            </div>

            {detail.description && (
                <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: '10px 0 0', opacity: 0.85 }}>
                    {detail.description}
                </p>
            )}

            {detail.href && (
                <a
                    href={detail.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'inline-block',
                        marginTop: 14,
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: 'none',
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid currentColor',
                        color: 'var(--interactiveColorPrimary, #5a4fcf)',
                    }}
                >
                    Open demo ↗
                </a>
            )}
        </div>
    );
}
