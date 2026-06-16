import React, { useState } from 'react';
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

    const handle = (id) => {
        const elements = buildShape(id, 100, 100);
        onAdd(elements);
    };

    return (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Heading level={3}>Shape library</Heading>
            {SHAPE_CATEGORIES.map((cat) => (
                <div key={cat.name}>
                    <div
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            opacity: 0.7,
                            marginBottom: 6,
                        }}
                    >
                        {cat.name}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {cat.shapes.map((s) => {
                            const Icon = SHAPE_ICONS[s.id];
                            return (
                                <Button
                                    key={s.id}
                                    size="small"
                                    onClick={() => handle(s.id)}
                                    style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 4 }}
                                    icon={Icon ? <Icon size={1.2} /> : undefined}
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
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: 6,
                        }}
                    >
                        {MARKETING_ICONS.map((icon) => (
                            <button
                                key={icon.id}
                                title={icon.label}
                                onClick={() => onAddImage(icon)}
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
                                    src={icon.dataURL}
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
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
