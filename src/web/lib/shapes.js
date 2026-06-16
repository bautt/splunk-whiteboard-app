// Splunk shape stencils — each factory returns an array of Excalidraw element
// specs that the canvas can append. Coordinates are relative to (x, y) at the
// top-left of the stencil; the caller positions it.

import { nanoid } from './nanoid';
import { STICKY_COLORS } from './splunkTheme';

const SPLUNK_GREEN = '#65A637';
const SPLUNK_PINK = '#F7912C';
const SPLUNK_BLUE = '#1E93C6';
const SPLUNK_PURPLE = '#9762D0';
const SPLUNK_ORANGE = '#ED8B00';
const NEUTRAL = '#5C5C5C';

const FONT_SIZE = 14;
const LINE_HEIGHT = 1.25;
// Per-line pixel height at FONT_SIZE 14 with LINE_HEIGHT 1.25
const LINE_PX = Math.ceil(FONT_SIZE * LINE_HEIGHT); // 18px

const COMMON = {
    angle: 0,
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 3 },
    seed: 0,
    versionNonce: 0,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
};

// Calculate the pixel height needed for a label string (supports \n).
function textHeight(label, fontSize = FONT_SIZE) {
    if (!label) return 0;
    const lines = label.split('\n').length;
    return Math.ceil(lines * fontSize * LINE_HEIGHT);
}

function makeLabel(groupId, { x, y, w, h, label, fontSize = FONT_SIZE }) {
    const lines = (label || '').split('\n').length;
    const th = Math.ceil(lines * fontSize * LINE_HEIGHT);
    return {
        ...COMMON,
        id: nanoid(),
        type: 'text',
        // Center vertically inside the shape
        x: x + 8,
        y: y + h / 2 - th / 2,
        width: w - 16,
        height: th,
        text: label,
        fontSize,
        fontFamily: 2,
        textAlign: 'center',
        verticalAlign: 'middle',
        baseline: Math.ceil(fontSize * LINE_HEIGHT * (lines - 0.15)),
        strokeColor: '#1B1B1B',
        backgroundColor: 'transparent',
        roundness: null,
        containerId: null,
        originalText: label,
        lineHeight: LINE_HEIGHT,
        groupIds: [groupId],
    };
}

function rect({ x, y, w, h, color, fill, label }) {
    const groupId = nanoid();
    const elements = [
        {
            ...COMMON,
            id: nanoid(),
            type: 'rectangle',
            x,
            y,
            width: w,
            height: h,
            strokeColor: color,
            backgroundColor: fill,
            groupIds: [groupId],
        },
    ];
    if (label) elements.push(makeLabel(groupId, { x, y, w, h, label }));
    return elements;
}

function ellipse({ x, y, w, h, color, fill, label }) {
    const groupId = nanoid();
    const elements = [
        {
            ...COMMON,
            id: nanoid(),
            type: 'ellipse',
            x,
            y,
            width: w,
            height: h,
            strokeColor: color,
            backgroundColor: fill,
            groupIds: [groupId],
        },
    ];
    if (label) elements.push(makeLabel(groupId, { x, y, w, h, label }));
    return elements;
}

function diamond({ x, y, w, h, color, fill, label }) {
    const groupId = nanoid();
    const elements = [
        {
            ...COMMON,
            id: nanoid(),
            type: 'diamond',
            x,
            y,
            width: w,
            height: h,
            strokeColor: color,
            backgroundColor: fill,
            groupIds: [groupId],
        },
    ];
    if (label) elements.push(makeLabel(groupId, { x, y, w, h, label, fontSize: 13 }));
    return elements;
}

function lighten(hex, amount = 0.85) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const blend = (c) => Math.round(c + (255 - c) * amount);
    return `#${blend(r).toString(16).padStart(2, '0')}${blend(g)
        .toString(16)
        .padStart(2, '0')}${blend(b).toString(16).padStart(2, '0')}`;
}

// ── Infrastructure ────────────────────────────────────────────────────────────

function universalForwarder(x, y) {
    return rect({ x, y, w: 140, h: 60, color: SPLUNK_GREEN, fill: lighten(SPLUNK_GREEN), label: 'Universal\nForwarder' });
}

function heavyForwarder(x, y) {
    return rect({ x, y, w: 140, h: 60, color: SPLUNK_PINK, fill: lighten(SPLUNK_PINK), label: 'Heavy\nForwarder' });
}

function indexer(x, y) {
    return rect({ x, y, w: 140, h: 80, color: SPLUNK_GREEN, fill: lighten(SPLUNK_GREEN), label: 'Indexer' });
}

function indexerCluster(x, y) {
    const groupId = nanoid();
    const els = [
        ...rect({ x: x + 6, y: y + 6, w: 140, h: 80, color: SPLUNK_GREEN, fill: lighten(SPLUNK_GREEN) }),
        ...rect({ x: x + 3, y: y + 3, w: 140, h: 80, color: SPLUNK_GREEN, fill: lighten(SPLUNK_GREEN) }),
        ...rect({ x, y, w: 140, h: 80, color: SPLUNK_GREEN, fill: lighten(SPLUNK_GREEN), label: 'Indexer\nCluster' }),
    ];
    return els.map((e) => ({ ...e, groupIds: [groupId] }));
}

function searchHead(x, y) {
    return rect({ x, y, w: 140, h: 70, color: SPLUNK_PURPLE, fill: lighten(SPLUNK_PURPLE), label: 'Search Head' });
}

function searchHeadCluster(x, y) {
    const groupId = nanoid();
    const els = [
        ...rect({ x: x + 6, y: y + 6, w: 140, h: 70, color: SPLUNK_PURPLE, fill: lighten(SPLUNK_PURPLE) }),
        ...rect({ x: x + 3, y: y + 3, w: 140, h: 70, color: SPLUNK_PURPLE, fill: lighten(SPLUNK_PURPLE) }),
        ...rect({ x, y, w: 140, h: 70, color: SPLUNK_PURPLE, fill: lighten(SPLUNK_PURPLE), label: 'Search Head\nCluster' }),
    ];
    return els.map((e) => ({ ...e, groupIds: [groupId] }));
}

function deploymentServer(x, y) {
    return rect({ x, y, w: 140, h: 60, color: NEUTRAL, fill: lighten(NEUTRAL), label: 'Deployment\nServer' });
}

function licenseManager(x, y) {
    return rect({ x, y, w: 140, h: 60, color: NEUTRAL, fill: lighten(NEUTRAL), label: 'License\nManager' });
}

function monitoringConsole(x, y) {
    return rect({ x, y, w: 140, h: 60, color: NEUTRAL, fill: lighten(NEUTRAL), label: 'Monitoring\nConsole' });
}

function clusterMaster(x, y) {
    return rect({ x, y, w: 140, h: 60, color: NEUTRAL, fill: lighten(NEUTRAL), label: 'Cluster\nMaster' });
}

function edgeProcessor(x, y) {
    return rect({ x, y, w: 140, h: 60, color: SPLUNK_ORANGE, fill: lighten(SPLUNK_ORANGE), label: 'Edge\nProcessor' });
}

function ingestProcessor(x, y) {
    return rect({ x, y, w: 140, h: 60, color: SPLUNK_ORANGE, fill: lighten(SPLUNK_ORANGE), label: 'Ingest\nProcessor' });
}

// ── Cloud ─────────────────────────────────────────────────────────────────────

function splunkCloud(x, y) {
    return ellipse({ x, y, w: 180, h: 90, color: SPLUNK_PINK, fill: lighten(SPLUNK_PINK), label: 'Splunk Cloud' });
}

function hec(x, y) {
    return rect({ x, y, w: 120, h: 50, color: SPLUNK_BLUE, fill: lighten(SPLUNK_BLUE), label: 'HEC' });
}

function s3Archive(x, y) {
    return rect({ x, y, w: 140, h: 60, color: NEUTRAL, fill: lighten(NEUTRAL), label: 'S3 Archive' });
}

// ── Data sources ──────────────────────────────────────────────────────────────

function server(x, y) {
    return rect({ x, y, w: 120, h: 60, color: NEUTRAL, fill: lighten(NEUTRAL, 0.92), label: 'Server' });
}

function database(x, y) {
    const groupId = nanoid();
    const label = 'Database';
    const th = textHeight(label);
    const els = [
        {
            ...COMMON,
            id: nanoid(),
            type: 'ellipse',
            x,
            y,
            width: 120,
            height: 24,
            strokeColor: NEUTRAL,
            backgroundColor: lighten(NEUTRAL, 0.92),
            groupIds: [groupId],
        },
        {
            ...COMMON,
            id: nanoid(),
            type: 'rectangle',
            x,
            y: y + 12,
            width: 120,
            height: 50,
            strokeColor: NEUTRAL,
            backgroundColor: lighten(NEUTRAL, 0.92),
            groupIds: [groupId],
        },
        {
            ...COMMON,
            id: nanoid(),
            type: 'ellipse',
            x,
            y: y + 50,
            width: 120,
            height: 24,
            strokeColor: NEUTRAL,
            backgroundColor: lighten(NEUTRAL, 0.92),
            groupIds: [groupId],
        },
        {
            ...COMMON,
            id: nanoid(),
            type: 'text',
            x: x + 10,
            y: y + 37 - th / 2,
            width: 100,
            height: th,
            text: label,
            fontSize: FONT_SIZE,
            fontFamily: 2,
            textAlign: 'center',
            verticalAlign: 'middle',
            baseline: Math.ceil(FONT_SIZE * LINE_HEIGHT),
            strokeColor: '#1B1B1B',
            backgroundColor: 'transparent',
            roundness: null,
            containerId: null,
            originalText: label,
            lineHeight: LINE_HEIGHT,
            groupIds: [groupId],
        },
    ];
    return els;
}

function syslogSource(x, y) {
    return rect({ x, y, w: 120, h: 50, color: NEUTRAL, fill: lighten(NEUTRAL, 0.92), label: 'Syslog' });
}

function cloudService(x, y) {
    return ellipse({ x, y, w: 140, h: 70, color: SPLUNK_BLUE, fill: lighten(SPLUNK_BLUE), label: 'Cloud\nService' });
}

// ── Network ───────────────────────────────────────────────────────────────────

function firewall(x, y) {
    return diamond({ x, y, w: 120, h: 80, color: '#D43F3F', fill: lighten('#D43F3F'), label: 'Firewall' });
}

function router(x, y) {
    return ellipse({ x, y, w: 110, h: 50, color: NEUTRAL, fill: lighten(NEUTRAL, 0.92), label: 'Router' });
}

function internet(x, y) {
    return ellipse({ x, y, w: 160, h: 70, color: SPLUNK_BLUE, fill: lighten(SPLUNK_BLUE, 0.9), label: 'Internet' });
}

// ── Annotations ───────────────────────────────────────────────────────────────

function sticky(kind) {
    return (x, y) => rect({
        x,
        y,
        w: 140,
        h: 100,
        color: STICKY_COLORS[kind],
        fill: lighten(STICKY_COLORS[kind], 0.7),
        label: kind.charAt(0).toUpperCase() + kind.slice(1),
    });
}

function zoneBox(label) {
    return (x, y) => rect({
        x,
        y,
        w: 320,
        h: 220,
        color: NEUTRAL,
        fill: 'transparent',
        label,
    });
}

export const SHAPE_CATEGORIES = [
    {
        name: 'Splunk Infrastructure',
        shapes: [
            { id: 'uf', label: 'Universal Forwarder', factory: universalForwarder },
            { id: 'hf', label: 'Heavy Forwarder', factory: heavyForwarder },
            { id: 'indexer', label: 'Indexer', factory: indexer },
            { id: 'indexerCluster', label: 'Indexer Cluster', factory: indexerCluster },
            { id: 'sh', label: 'Search Head', factory: searchHead },
            { id: 'shc', label: 'Search Head Cluster', factory: searchHeadCluster },
            { id: 'ds', label: 'Deployment Server', factory: deploymentServer },
            { id: 'lm', label: 'License Manager', factory: licenseManager },
            { id: 'mc', label: 'Monitoring Console', factory: monitoringConsole },
            { id: 'cm', label: 'Cluster Master', factory: clusterMaster },
            { id: 'ep', label: 'Edge Processor', factory: edgeProcessor },
            { id: 'ip', label: 'Ingest Processor', factory: ingestProcessor },
        ],
    },
    {
        name: 'Splunk Cloud',
        shapes: [
            { id: 'splunkCloud', label: 'Splunk Cloud', factory: splunkCloud },
            { id: 'hec', label: 'HEC', factory: hec },
            { id: 's3', label: 'S3 Archive', factory: s3Archive },
        ],
    },
    {
        name: 'Data Sources',
        shapes: [
            { id: 'server', label: 'Server', factory: server },
            { id: 'db', label: 'Database', factory: database },
            { id: 'syslog', label: 'Syslog', factory: syslogSource },
            { id: 'cloudSvc', label: 'Cloud Service', factory: cloudService },
        ],
    },
    {
        name: 'Network',
        shapes: [
            { id: 'firewall', label: 'Firewall', factory: firewall },
            { id: 'router', label: 'Router', factory: router },
            { id: 'internet', label: 'Internet', factory: internet },
        ],
    },
    {
        name: 'Sticky Notes',
        shapes: [
            { id: 'sticky-alert', label: 'Alert', factory: sticky('alert') },
            { id: 'sticky-warning', label: 'Warning', factory: sticky('warning') },
            { id: 'sticky-healthy', label: 'Healthy', factory: sticky('healthy') },
            { id: 'sticky-info', label: 'Info', factory: sticky('info') },
        ],
    },
    {
        name: 'Zone Boxes',
        shapes: [
            { id: 'zone-onprem', label: 'On-prem', factory: zoneBox('On-prem') },
            { id: 'zone-cloud', label: 'Cloud', factory: zoneBox('Cloud') },
            { id: 'zone-dmz', label: 'DMZ', factory: zoneBox('DMZ') },
        ],
    },
];

export function buildShape(shapeId, x = 100, y = 100) {
    for (const cat of SHAPE_CATEGORIES) {
        const shape = cat.shapes.find((s) => s.id === shapeId);
        if (shape) return shape.factory(x, y);
    }
    return [];
}
