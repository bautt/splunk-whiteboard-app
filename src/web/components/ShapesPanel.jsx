import React, { useMemo, useState } from 'react';
import ReactDOMServer from 'react-dom/server';
import Button from '@splunk/react-ui/Button';
import Heading from '@splunk/react-ui/Heading';

// Splunk react-icons for shape buttons
import ForwarderUniversal from '@splunk/react-icons/ForwarderUniversal';
import ForwarderHeavy from '@splunk/react-icons/ForwarderHeavy';
import CylinderIndex from '@splunk/react-icons/CylinderIndex';
import Indexes from '@splunk/react-icons/Indexes';
import MonitorUser from '@splunk/react-icons/MonitorUser';
import Servers from '@splunk/react-icons/Servers';
import ServerLicense from '@splunk/react-icons/ServerLicense';
import StorageMonitor from '@splunk/react-icons/StorageMonitor';
import NetworkDevice from '@splunk/react-icons/NetworkDevice';
import Processor from '@splunk/react-icons/Processor';
import ServersCloud from '@splunk/react-icons/ServersCloud';
import CloudArrowInRight from '@splunk/react-icons/CloudArrowInRight';
import Bucket from '@splunk/react-icons/Bucket';
import NetworkConnector from '@splunk/react-icons/NetworkConnector';
import NetworkDevices from '@splunk/react-icons/NetworkDevices';
import CellularGateway from '@splunk/react-icons/CellularGateway';
import DeviceEdgeHub from '@splunk/react-icons/DeviceEdgeHub';
import DataType from '@splunk/react-icons/DataType';
import Shield from '@splunk/react-icons/Shield';
import Cloud from '@splunk/react-icons/Cloud';
import DriveIndexes from '@splunk/react-icons/DriveIndexes';

import { SHAPE_CATEGORIES, buildShape } from '../lib/shapes';
import MARKETING_ICONS from '../lib/marketingIcons';

// Map shape id → icon component
const SHAPE_ICONS = {
    uf:                 ForwarderUniversal,
    hf:                 ForwarderHeavy,
    indexer:            CylinderIndex,
    indexerCluster:     Indexes,
    sh:                 MonitorUser,
    shc:                Servers,
    ds:                 NetworkDevice,
    lm:                 ServerLicense,
    mc:                 StorageMonitor,
    cm:                 NetworkConnector,
    ep:                 Processor,
    ip:                 Processor,
    splunkCloud:        ServersCloud,
    hec:                CloudArrowInRight,
    s3:                 Bucket,
    server:             NetworkDevices,
    db:                 DriveIndexes,
    syslog:             DataType,
    cloudSvc:           Cloud,
    firewall:           Shield,
    router:             CellularGateway,
    internet:           DeviceEdgeHub,
};

export default function ShapesPanel({ onAdd, onAddImage }) {
    const [mktgExpanded, setMktgExpanded] = useState(false);
    const [iconColor, setIconColor] = useState('#000000');
    // 'elements' = insert as grouped Excalidraw shapes; 'svg' = insert as tinted SVG image
    const [shapeMode, setShapeMode] = useState('elements');

    const handle = (id) => {
        const elements = buildShape(id, 100, 100);
        onAdd(elements);
    };

    // Build a data URL from raw SVG with the chosen tint color.
    // Handles both explicit fill attributes and fill/stroke="currentColor".
    const tintedDataURL = (svgText, color) => {
        const tinted = svgText
            // inject fill on root <svg> for paths with no explicit fill
            .replace(/^(<svg\b[^>]*)(>)/i, (_, tag, close) => `${tag} fill="${color}"${close}`)
            // replace currentColor references so they resolve when used as <img>
            .replace(/fill="currentColor"/g, `fill="${color}"`)
            .replace(/stroke="currentColor"/g, `stroke="${color}"`);
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(tinted)));
    };

    // Pre-render each react-icon to an SVG string once.
    const shapeSvgs = useMemo(() => {
        const map = {};
        for (const [id, IconComp] of Object.entries(SHAPE_ICONS)) {
            if (!IconComp) continue;
            try {
                // Render the icon at 128px; icons output <svg> with width/height attrs
                const markup = ReactDOMServer.renderToStaticMarkup(
                    React.createElement(IconComp, { size: 3 })
                );
                // Ensure it looks like an SVG element
                if (markup.startsWith('<svg')) {
                    map[id] = markup;
                }
            } catch (e) {
                // skip icons that fail to render
            }
        }
        return map;
    }, []);

    const COLOR_PRESETS = ['#000000', '#ef4444', '#f97316', '#3b82f6', '#22c55e', '#9333ea', '#65737e'];

    const ColorRow = () => (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10,
                padding: '6px 8px',
                background: 'var(--gray95, #f2f4f5)',
                borderRadius: 6,
                fontSize: 12,
            }}
        >
            <span style={{ opacity: 0.7 }}>Color:</span>
            <input
                type="color"
                value={iconColor}
                onChange={(e) => setIconColor(e.target.value)}
                style={{
                    width: 28, height: 28, padding: 2,
                    border: '1px solid var(--gray60, #c3cbd4)',
                    borderRadius: 4, cursor: 'pointer', background: 'none',
                }}
            />
            <span style={{ fontFamily: 'monospace', opacity: 0.7 }}>{iconColor}</span>
            {COLOR_PRESETS.map((c) => (
                <button
                    key={c}
                    onClick={() => setIconColor(c)}
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
                            const hasSvg = !!shapeSvgs[s.id];
                            const isSvgMode = shapeMode === 'svg' && hasSvg;

                            const handleClick = () => {
                                if (isSvgMode) {
                                    onAddImage({ id: `shape-${s.id}`, svg: shapeSvgs[s.id], color: iconColor });
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

            {/* ── Marketing Icons ─────────────────────────── */}
            <div>
                <button
                    onClick={() => setMktgExpanded((v) => !v)}
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
                    <span style={{ fontSize: 10 }}>{mktgExpanded ? '▼' : '▶'}</span>
                    Splunk Marketing Icons ({MARKETING_ICONS.length})
                </button>
                {mktgExpanded && (
                    <>
                        <ColorRow />
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: 6,
                            }}
                        >
                            {MARKETING_ICONS.map((icon) => {
                                const preview = tintedDataURL(icon.svg, iconColor);
                                return (
                                    <button
                                        key={icon.id}
                                        title={icon.label}
                                        onClick={() => onAddImage({ ...icon, color: iconColor })}
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
                )}
            </div>
        </div>
    );
}
