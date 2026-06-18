import React, { useCallback, useEffect, useState } from 'react';
import Button from '@splunk/react-ui/Button';
import Heading from '@splunk/react-ui/Heading';

import { parseColorInput } from '../lib/canvasAppearance';
import { SHAPE_CATEGORIES, buildShape } from '../lib/shapes';
import MARKETING_ICONS from '../lib/marketingIcons';
import BRAND_ICONS from '../lib/brandIcons';
import { SHAPE_ICONS, getShapeSvgMarkup } from '../lib/shapeIcons';
import { normalizeIconColor } from '../lib/iconFiles';
import { iconToDataUrl } from '../lib/tintSvg';

export default function ShapesPanel({ onAdd, onAddImage }) {
    const [mktgExpanded, setMktgExpanded] = useState(false);
    const [brandExpanded, setBrandExpanded] = useState(true);
    const [iconColor, setIconColor] = useState('#000000');
    const [iconColorText, setIconColorText] = useState('#000000');
    const [iconColorError, setIconColorError] = useState('');

    useEffect(() => {
        setIconColorText(iconColor);
        setIconColorError('');
    }, [iconColor]);

    const setIconColorSafe = useCallback((next) => {
        const normalized = normalizeIconColor(next);
        setIconColor(normalized);
        setIconColorText(normalized);
        setIconColorError('');
    }, []);

    const commitIconColorText = useCallback(() => {
        const parsed = parseColorInput(iconColorText);
        if (!parsed) {
            setIconColorError('Use #hex, rgb(r, g, b), or r, g, b');
            return;
        }
        setIconColor(parsed);
        setIconColorText(parsed);
        setIconColorError('');
    }, [iconColorText]);
    // 'elements' = insert as grouped Excalidraw shapes; 'svg' = insert as tinted SVG image
    const [shapeMode, setShapeMode] = useState('elements');

    const handle = (id) => {
        const elements = buildShape(id, 100, 100);
        onAdd(elements);
    };

    const tintedDataURL = (icon, color) => iconToDataUrl(icon, color);

    const COLOR_PRESETS = ['#000000', '#ef4444', '#f97316', '#3b82f6', '#22c55e', '#9333ea', '#65737e'];

    const IconGrid = ({ icons, showColor }) => (
        <>
            {showColor && <ColorRow />}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 6,
                }}
            >
                {icons.map((icon) => {
                    const preview = tintedDataURL(icon, iconColor);
                    return (
                        <button
                            key={icon.id}
                            title={icon.label}
                            onClick={() => onAddImage({ ...icon, color: icon.tintable === false ? undefined : iconColor })}
                            style={{
                                all: 'unset',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 3,
                                padding: '8px 4px',
                                border: '1px solid var(--gray60, #c3cbd4)',
                                borderRadius: 6,
                                background: 'transparent',
                                minWidth: 0,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--gray95, #f2f4f5)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <img
                                src={preview}
                                alt={icon.label}
                                style={{ width: 36, height: 36, objectFit: 'contain' }}
                            />
                            <span
                                style={{
                                    fontSize: 9,
                                    textAlign: 'center',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    width: '100%',
                                    display: 'block',
                                    color: 'var(--gray30, #444)',
                                }}
                            >
                                {icon.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </>
    );

    const SectionToggle = ({ expanded, onToggle, label }) => (
        <button
            onClick={onToggle}
            style={{
                all: 'unset',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                opacity: 0.7,
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
            }}
        >
            <span style={{ fontSize: 10 }}>{expanded ? '▼' : '▶'}</span>
            {label}
        </button>
    );

    const ColorRow = () => (
        <div style={{ marginBottom: 10 }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    background: 'var(--gray95, #f2f4f5)',
                    borderRadius: 6,
                    fontSize: 12,
                    flexWrap: 'wrap',
                }}
            >
                <span style={{ opacity: 0.7 }}>Color:</span>
                <input
                    type="color"
                    value={iconColor}
                    onChange={(e) => setIconColorSafe(e.target.value)}
                    style={{
                        width: 28, height: 28, padding: 2,
                        border: '1px solid var(--gray60, #c3cbd4)',
                        borderRadius: 4, cursor: 'pointer', background: 'none',
                    }}
                />
                <input
                    type="text"
                    value={iconColorText}
                    onChange={(e) => {
                        setIconColorText(e.target.value);
                        setIconColorError('');
                    }}
                    onBlur={commitIconColorText}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            commitIconColorText();
                        }
                    }}
                    placeholder="#000000"
                    spellCheck={false}
                    aria-label="Icon color hex or RGB"
                    style={{
                        width: 96,
                        padding: '4px 6px',
                        fontSize: 12,
                        fontFamily: 'monospace',
                        border: `1px solid ${iconColorError ? '#dc4e41' : 'var(--gray60, #c3cbd4)'}`,
                        borderRadius: 4,
                        background: 'var(--white, #fff)',
                    }}
                />
                {COLOR_PRESETS.map((c) => (
                    <button
                        key={c}
                        onClick={() => setIconColorSafe(c)}
                        title={c}
                        style={{
                            all: 'unset', width: 16, height: 16, borderRadius: '50%',
                            background: c, cursor: 'pointer', flexShrink: 0,
                            border: iconColor === c ? '2px solid white' : '1px solid rgba(0,0,0,0.2)',
                            boxShadow: iconColor === c ? `0 0 0 2px ${c}` : 'none',
                        }}
                    />
                ))}
            </div>
            {iconColorError && (
                <div style={{ fontSize: 11, color: '#dc4e41', marginTop: 4, paddingLeft: 8 }}>
                    {iconColorError}
                </div>
            )}
        </div>
    );

    return (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Heading level={3}>Shape library</Heading>

            {/* ── Insert mode toggle ──────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Insert as:</span>
                <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--gray60, #c3cbd4)' }}>
                    {[
                        { value: 'elements', label: 'Elements' },
                        { value: 'svg', label: 'SVG Icon' },
                    ].map(({ value, label }) => (
                        <button
                            key={value}
                            onClick={() => setShapeMode(value)}
                            style={{
                                all: 'unset',
                                padding: '3px 10px',
                                fontSize: 12,
                                cursor: 'pointer',
                                background: shapeMode === value ? 'var(--interactive-color, #5a4fcf)' : 'transparent',
                                color: shapeMode === value ? '#fff' : 'inherit',
                                fontWeight: shapeMode === value ? 600 : 400,
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                {shapeMode === 'svg' && (
                    <span style={{ fontSize: 11, opacity: 0.55 }}>pick color below</span>
                )}
            </div>

            {shapeMode === 'svg' && <ColorRow />}

            {SHAPE_CATEGORIES.map((cat) => (
                <div key={cat.name}>
                    <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', opacity: 0.7, marginBottom: 6 }}>
                        {cat.name}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {cat.shapes.map((s) => {
                            const Icon = SHAPE_ICONS[s.id];
                            const svgMarkup = getShapeSvgMarkup(s.id);
                            const isSvgMode = shapeMode === 'svg' && !!svgMarkup;

                            const handleClick = () => {
                                if (isSvgMode) {
                                    onAddImage({ id: `shape-${s.id}`, svg: svgMarkup, color: iconColor });
                                } else {
                                    handle(s.id);
                                }
                            };

                            return (
                                <Button
                                    key={s.id}
                                    size="small"
                                    appearance={isSvgMode ? 'secondary' : 'default'}
                                    onClick={handleClick}
                                    style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 4 }}
                                    icon={Icon ? <Icon size={1.2} /> : undefined}
                                    title={isSvgMode ? `Insert ${s.label} as SVG icon` : `Insert ${s.label} as elements`}
                                >
                                    {s.label}
                                </Button>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* ── Brand logos ─────────────────────────────── */}
            <div>
                <SectionToggle
                    expanded={brandExpanded}
                    onToggle={() => setBrandExpanded((v) => !v)}
                    label={`Brand logos (${BRAND_ICONS.length})`}
                />
                {brandExpanded && (
                    <>
                        <p style={{ fontSize: 11, opacity: 0.65, margin: '0 0 8px' }}>
                            Official brand colors (not tintable).
                        </p>
                        <IconGrid icons={BRAND_ICONS} showColor={false} />
                    </>
                )}
            </div>

            {/* ── Marketing Icons ─────────────────────────── */}
            <div>
                <SectionToggle
                    expanded={mktgExpanded}
                    onToggle={() => setMktgExpanded((v) => !v)}
                    label={`Splunk Marketing Icons (${MARKETING_ICONS.length})`}
                />
                {mktgExpanded && <IconGrid icons={MARKETING_ICONS} showColor />}
            </div>
        </div>
    );
}
