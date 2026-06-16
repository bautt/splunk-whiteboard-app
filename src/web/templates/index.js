// Use case templates — each returns a fresh array of Excalidraw element specs.
// Positions are laid out in absolute coordinates so they render the same on any board.

import { buildShape } from '../lib/shapes';
import { nanoid } from '../lib/nanoid';

function arrow(x1, y1, x2, y2, label) {
    const groupId = nanoid();
    const dx = x2 - x1;
    const dy = y2 - y1;
    const els = [
        {
            id: nanoid(),
            type: 'arrow',
            x: x1,
            y: y1,
            width: dx,
            height: dy,
            angle: 0,
            strokeColor: '#1B1B1B',
            backgroundColor: 'transparent',
            fillStyle: 'solid',
            strokeWidth: 2,
            strokeStyle: 'solid',
            roughness: 0,
            opacity: 100,
            groupIds: [groupId],
            frameId: null,
            roundness: { type: 2 },
            seed: 0,
            versionNonce: 0,
            isDeleted: false,
            boundElements: null,
            updated: 1,
            link: null,
            locked: false,
            points: [
                [0, 0],
                [dx, dy],
            ],
            lastCommittedPoint: null,
            startBinding: null,
            endBinding: null,
            startArrowhead: null,
            endArrowhead: 'arrow',
        },
    ];
    if (label) {
        const midX = (x1 + x2) / 2 - 30;
        const midY = (y1 + y2) / 2 - 20;
        els.push({
            id: nanoid(),
            type: 'text',
            x: midX,
            y: midY,
            width: 80,
            height: 18,
            text: label,
            fontSize: 12,
            fontFamily: 2,
            textAlign: 'center',
            verticalAlign: 'middle',
            baseline: 12,
            angle: 0,
            strokeColor: '#5C5C5C',
            backgroundColor: 'transparent',
            fillStyle: 'solid',
            strokeWidth: 1,
            strokeStyle: 'solid',
            roughness: 0,
            opacity: 100,
            groupIds: [groupId],
            frameId: null,
            roundness: null,
            seed: 0,
            versionNonce: 0,
            isDeleted: false,
            boundElements: null,
            updated: 1,
            link: null,
            locked: false,
            containerId: null,
            originalText: label,
            lineHeight: 1.25,
        });
    }
    return els;
}

function title(text, x, y) {
    return [
        {
            id: nanoid(),
            type: 'text',
            x,
            y,
            width: 400,
            height: 30,
            text,
            fontSize: 24,
            fontFamily: 2,
            textAlign: 'left',
            verticalAlign: 'top',
            baseline: 24,
            angle: 0,
            strokeColor: '#1B1B1B',
            backgroundColor: 'transparent',
            fillStyle: 'solid',
            strokeWidth: 1,
            strokeStyle: 'solid',
            roughness: 0,
            opacity: 100,
            groupIds: [],
            frameId: null,
            roundness: null,
            seed: 0,
            versionNonce: 0,
            isDeleted: false,
            boundElements: null,
            updated: 1,
            link: null,
            locked: false,
            containerId: null,
            originalText: text,
            lineHeight: 1.25,
        },
    ];
}

function buildSiem() {
    const els = [];
    els.push(...title('SIEM — Splunk Enterprise Security', 100, 60));

    // Data sources column
    els.push(...buildShape('firewall', 100, 180));
    els.push(...buildShape('server', 110, 320));
    els.push(...buildShape('db', 110, 430));

    // Forwarders
    els.push(...buildShape('uf', 340, 280));
    els.push(...buildShape('hf', 340, 400));

    // Indexer cluster
    els.push(...buildShape('indexerCluster', 580, 320));

    // Search head cluster
    els.push(...buildShape('shc', 820, 320));

    // Analyst sticky
    els.push(...buildShape('sticky-info', 1060, 320));

    // Arrows
    els.push(...arrow(220, 220, 340, 300, 'syslog'));
    els.push(...arrow(230, 350, 340, 320, ''));
    els.push(...arrow(230, 460, 340, 420, ''));
    els.push(...arrow(480, 310, 580, 350, 'parse'));
    els.push(...arrow(480, 430, 580, 380, ''));
    els.push(...arrow(720, 360, 820, 360, 'search'));
    els.push(...arrow(960, 360, 1060, 360, 'investigate'));

    return els;
}

function buildObservability() {
    const els = [];
    els.push(...title('Observability — Splunk Cloud', 100, 60));

    els.push(...buildShape('cloudSvc', 100, 200));
    els.push(...buildShape('server', 110, 320));
    els.push(...buildShape('cloudSvc', 100, 430));
    els.push(...buildShape('hec', 360, 280));
    els.push(...buildShape('uf', 360, 400));
    els.push(...buildShape('splunkCloud', 580, 320));
    els.push(...buildShape('shc', 840, 200));
    els.push(...buildShape('sticky-info', 840, 340));
    els.push(...buildShape('sticky-warning', 840, 470));

    els.push(...arrow(240, 240, 360, 305, 'metrics'));
    els.push(...arrow(230, 350, 360, 320, 'logs'));
    els.push(...arrow(240, 470, 360, 425, 'traces'));
    els.push(...arrow(480, 305, 580, 355, ''));
    els.push(...arrow(500, 425, 580, 385, ''));
    els.push(...arrow(760, 365, 840, 235, 'dashboards'));
    els.push(...arrow(760, 365, 840, 375, 'alerts'));
    els.push(...arrow(760, 365, 840, 510, 'ITSI'));

    return els;
}

function buildItOps() {
    const els = [];
    els.push(...title('IT Ops — Service Monitoring', 100, 60));

    els.push(...buildShape('server', 110, 200));
    els.push(...buildShape('server', 110, 290));
    els.push(...buildShape('server', 110, 380));
    els.push(...buildShape('db', 110, 470));

    els.push(...buildShape('uf', 340, 200));
    els.push(...buildShape('uf', 340, 290));
    els.push(...buildShape('uf', 340, 380));
    els.push(...buildShape('uf', 340, 470));

    els.push(...buildShape('indexerCluster', 580, 320));
    els.push(...buildShape('sh', 820, 240));
    els.push(...buildShape('sticky-healthy', 820, 360));
    els.push(...buildShape('sticky-alert', 820, 490));

    els.push(...arrow(230, 230, 340, 230, ''));
    els.push(...arrow(230, 320, 340, 320, ''));
    els.push(...arrow(230, 410, 340, 410, ''));
    els.push(...arrow(230, 500, 340, 500, ''));
    els.push(...arrow(480, 230, 580, 340, ''));
    els.push(...arrow(480, 320, 580, 360, ''));
    els.push(...arrow(480, 410, 580, 380, ''));
    els.push(...arrow(480, 500, 580, 400, ''));
    els.push(...arrow(720, 360, 820, 275, 'ITSI'));
    els.push(...arrow(720, 360, 820, 400, 'OK'));
    els.push(...arrow(720, 360, 820, 530, 'incident'));

    return els;
}

export const TEMPLATES = [
    {
        id: 'siem',
        name: 'SIEM',
        description: 'Log sources → forwarders → indexers → search heads → analyst',
        build: buildSiem,
    },
    {
        id: 'observability',
        name: 'Observability',
        description: 'Cloud infra → HEC/forwarders → Splunk Cloud → dashboards, alerts, ITSI',
        build: buildObservability,
    },
    {
        id: 'itops',
        name: 'IT Ops',
        description: 'IT estate → UFs → indexers → Splunk + ITSI service tree',
        build: buildItOps,
    },
];
