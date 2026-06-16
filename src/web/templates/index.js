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

function txt(x, y, text, fontSize = 13, color = '#1B1B1B', align = 'left', fontFamily = 1) {
    const approxWidth = Math.max(text.length * fontSize * 0.62, 40);
    return {
        id: nanoid(), type: 'text',
        x, y, width: approxWidth, height: fontSize * 1.4,
        text, fontSize, fontFamily,
        textAlign: align, verticalAlign: 'top', baseline: fontSize,
        angle: 0, strokeColor: color, backgroundColor: 'transparent',
        fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid',
        roughness: 0, opacity: 100, groupIds: [], frameId: null,
        roundness: null, seed: 0, versionNonce: 0, isDeleted: false,
        boundElements: null, updated: 1, link: null, locked: false,
        containerId: null, originalText: text, lineHeight: 1.3,
    };
}

function box(x, y, w, h, label = '', strokeColor = '#1B1B1B', bgColor = 'transparent', sw = 2, fontSize = 13) {
    const rid = nanoid();
    const els = [{
        id: rid, type: 'rectangle',
        x, y, width: w, height: h,
        angle: 0, strokeColor, backgroundColor: bgColor,
        fillStyle: 'solid', strokeWidth: sw, strokeStyle: 'solid',
        roughness: 0, opacity: 100, groupIds: [], frameId: null,
        roundness: { type: 3 }, seed: 0, versionNonce: 0, isDeleted: false,
        boundElements: null, updated: 1, link: null, locked: false,
    }];
    if (label) {
        els.push(txt(
            x + w / 2 - Math.max(label.length * fontSize * 0.62, 40) / 2,
            y + (h - fontSize * 1.4) / 2,
            label, fontSize, strokeColor, 'center', 2
        ));
    }
    return els;
}

function stageBox(x, y, w, h, heading, subtext) {
    const els = box(x, y, w, h, '', '#1B1B1B', 'transparent', 2);
    els.push(txt(x + w / 2 - heading.length * 8, y + 12, heading, 14, '#1B1B1B', 'center', 2));
    if (subtext) {
        els.push(txt(x + 8, y + 38, subtext, 11, '#555555', 'center', 1));
    }
    return els;
}

function buildSapE2E() {
    const els = [];

    // ── Title ─────────────────────────────────────────────────────────────
    els.push(txt(430, 18, 'End-to-End Visibility for SAP', 22, '#cc0099', 'left', 2));

    // ── Hierarchy (center-top) ─────────────────────────────────────────────
    // C-LEVEL box
    els.push(...box(550, 55, 160, 36, 'C-LEVEL', '#1B1B1B', 'transparent', 2, 14));
    // Line down from C-LEVEL
    els.push(...arrow(630, 91, 500, 125, ''));
    els.push(...arrow(630, 91, 630, 125, ''));
    els.push(...arrow(630, 91, 755, 125, ''));
    // Second row
    els.push(...box(400, 125, 140, 34, 'BUSINESS', '#1B1B1B', 'transparent', 2, 13));
    els.push(...box(555, 125, 80, 34, 'NOC', '#1B1B1B', 'transparent', 2, 13));
    els.push(...box(650, 125, 80, 34, 'SOC', '#1B1B1B', 'transparent', 2, 13));

    // ── Left column: Initiatives ───────────────────────────────────────────
    els.push(txt(20, 60, 'Initiatives: shape+', 13, '#1B1B1B', 'left', 2));
    const initiatives = [
        '↑ Standardization',
        '↑ Automation',
        '↑ HANA consolidation',
        '↑ Real-time',
        '↓ Batch processing',
    ];
    initiatives.forEach((t, i) => els.push(txt(20, 84 + i * 20, t, 12, '#1B1B1B', 'left', 1)));

    // Actua section
    els.push(txt(20, 200, 'Actua', 13, '#1B1B1B', 'left', 2));
    const actua = [
        '↓ Fragmented view',
        '  Silos',
        '  Limited data',
        '  Too many tools',
    ];
    actua.forEach((t, i) => els.push(txt(20, 220 + i * 19, t, 12, '#1B1B1B', 'left', 1)));

    // Arrow down to datalake
    els.push(...arrow(90, 296, 90, 370, ''));
    // Datalake (cylinder-ish using two rects)
    els.push(...box(52, 370, 76, 50, '', '#1B1B1B', 'transparent', 2));
    els.push(...box(52, 370, 76, 14, '', '#1B1B1B', '#e8e8e8', 1));
    els.push(txt(38, 428, 'DATALAKE', 11, '#1B1B1B', 'left', 2));

    // Arrow from datalake into main box
    els.push(...arrow(128, 395, 240, 395, ''));

    // ── Main flow rectangle ────────────────────────────────────────────────
    els.push(...box(240, 175, 860, 380, '', '#1B1B1B', 'transparent', 2.5));

    // Stage: INVESTIGATE
    els.push(...stageBox(260, 200, 175, 330, 'INVESTIGATE', 'SCHEMA\nON READ'));

    // Stage: MONITOR
    els.push(...stageBox(455, 200, 150, 330, 'MONITOR', ''));
    // mini bar chart icon
    els.push(...box(480, 250, 14, 30, '', '#888', '#888', 1));
    els.push(...box(500, 260, 14, 20, '', '#888', '#888', 1));
    els.push(...box(520, 240, 14, 40, '', '#888', '#888', 1));

    // Stage: ANALYZE
    els.push(...stageBox(625, 200, 150, 330, 'ANALYZE', ''));
    // mini table grid icon
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            els.push(...box(645 + c * 18, 250 + r * 14, 16, 12, '', '#888', 'transparent', 1));
        }
    }
    els.push(txt(650, 300, 'ML', 11, '#1B1B1B', 'left', 2));

    // Stage: ACT
    els.push(...stageBox(795, 200, 130, 330, 'ACT', ''));
    // play button icon
    els.push({
        id: nanoid(), type: 'ellipse',
        x: 825, y: 250, width: 50, height: 50,
        angle: 0, strokeColor: '#1B1B1B', backgroundColor: '#e8e8e8',
        fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid',
        roughness: 0, opacity: 100, groupIds: [], frameId: null,
        roundness: { type: 3 }, seed: 0, versionNonce: 0, isDeleted: false,
        boundElements: null, updated: 1, link: null, locked: false,
    });
    els.push(txt(844, 266, '▶', 18, '#1B1B1B', 'center', 1));

    // Stage arrows (between stages inside main box)
    els.push(...arrow(435, 365, 455, 365, ''));
    els.push(...arrow(605, 365, 625, 365, ''));
    els.push(...arrow(775, 365, 795, 365, ''));

    // Arrow out right of main box → SNOW
    els.push(...arrow(1100, 395, 1155, 395, ''));

    // ── Right side ─────────────────────────────────────────────────────────
    // PYTHON icon box
    els.push(...box(1160, 200, 80, 70, '', '#1B1B1B', '#f6f6f6', 1.5));
    els.push(txt(1170, 215, '🐍', 24, '#1B1B1B', 'center', 1));
    els.push(txt(1167, 254, 'PYTHON', 10, '#1B1B1B', 'center', 2));

    // SNOW icon box
    els.push(...box(1160, 380, 80, 70, '', '#1B1B1B', '#f6f6f6', 1.5));
    els.push(txt(1170, 393, '❄️', 24, '#1B1B1B', 'center', 1));
    els.push(txt(1175, 432, 'SNOW', 10, '#1B1B1B', 'center', 2));

    // Outcomes section
    els.push(txt(1160, 60, 'Outcomes:', 13, '#1B1B1B', 'left', 2));
    const outcomes = [
        '↑ E2E view',
        '↑ SLA',
        '↑ Automation',
        '↑ MTTR',
        '↓ Error rate',
    ];
    outcomes.forEach((t, i) => els.push(txt(1160, 82 + i * 20, t, 12, '#1B1B1B', 'left', 1)));

    // ── Bottom: Business Data row ──────────────────────────────────────────
    els.push(txt(20, 590, 'Business Data', 13, '#1B1B1B', 'left', 2));
    const bizBoxes = ['SCM', 'ERP', 'SRM', 'MDG', 'HCM', 'PI', 'FI', 'BW', 'MM', 'PP', 'FS', 'PM'];
    bizBoxes.forEach((lbl, i) => {
        els.push(...box(170 + i * 84, 584, 78, 34, lbl, '#1B1B1B', 'transparent', 2, 13));
    });

    // ── Bottom: IT Data row ────────────────────────────────────────────────
    els.push(txt(20, 648, 'IT Data', 13, '#1B1B1B', 'left', 2));
    const itBoxes = ['SAP R3', 'HANA', 'SCP/HEC', 'KYMA', 'GUI', 'ADAP', 'JAVA', 'AWS', 'Azure', 'GCP', 'VM', 'ADS', 'DB', 'DNS', 'NET'];
    itBoxes.forEach((lbl, i) => {
        els.push(...box(170 + i * 68, 642, 62, 34, lbl, '#777777', '#fafafa', 1, 11));
    });

    return els;
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
        id: 'sap-e2e',
        name: 'SAP End-to-End Visibility',
        description: 'Business & IT data sources → Investigate → Monitor → Analyze → Act, with C-Level hierarchy and outcomes',
        build: buildSapE2E,
    },
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
