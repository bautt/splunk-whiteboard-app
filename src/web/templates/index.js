// Use case templates — each returns a fresh array of Excalidraw element specs.
// Positions are laid out in absolute coordinates so they render the same on any board.
// Templates may also return { elements, files } when they include SVG image elements.

import { buildShape } from '../lib/shapes';
import { nanoid } from '../lib/nanoid';
import { DRP_ICONS } from '../lib/drpIcons';

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

// ─── Digital Resilience Platform template ────────────────────────────────────

function imgEl(fileId, x, y, w, h) {
    return {
        id: nanoid(), type: 'image', fileId,
        x, y, width: w, height: h,
        angle: 0, scale: [1, 1], status: 'saved',
        strokeColor: 'transparent', backgroundColor: 'transparent',
        fillStyle: 'solid', strokeWidth: 0, strokeStyle: 'solid',
        roughness: 0, opacity: 100, groupIds: [], frameId: null,
        roundness: null, seed: 0, versionNonce: 0, isDeleted: false,
        boundElements: null, updated: 1, link: null, locked: false,
    };
}

// Tint an SVG data URL to a specific fill colour
function tintURL(dataURL, color) {
    try {
        const svgB64 = dataURL.split(',')[1];
        const svgText = atob(svgB64);
        const tinted = svgText
            .replace(/^(<svg\b[^>]*)(>)/i, (_, tag, close) => `${tag} fill="${color}"${close}`)
            .replace(/fill="currentColor"/g, `fill="${color}"`)
            .replace(/stroke="currentColor"/g, `stroke="${color}"`);
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(tinted)));
    } catch (e) {
        return dataURL;
    }
}

function buildDRP() {
    const els = [];
    const files = [];

    // Helper: register a tinted SVG and return its fileId
    function addIcon(key, color = '#1B1B1B') {
        if (!DRP_ICONS[key]) return null;
        const fileId = `drp-${key}-${color.replace('#', '')}`;
        if (!files.find((f) => f.id === fileId)) {
            files.push({
                id: fileId,
                dataURL: tintURL(DRP_ICONS[key], color),
                mimeType: 'image/svg+xml',
                created: Date.now(),
                lastRetrieved: Date.now(),
            });
        }
        return fileId;
    }

    // ── Title ──────────────────────────────────────────────────────────────
    els.push(txt(220, 10, 'The Digital Resilience Platform', 28, '#1B1B1B', 'center', 2));
    els.push(txt(1090, 12, '© 2024 Splunk Inc.', 9, '#999999', 'right', 1));

    // ── Left: Initiatives ─────────────────────────────────────────────────
    els.push(txt(10, 80, 'Initiatives:', 14, '#1B1B1B', 'left', 2));
    ['• Digitization', '• Data Driven', '• MTTI / MTTR', '• Cyber Risk',
        '• Business Focused', '• Apps Better & Faster',
    ].forEach((t, i) => els.push(txt(10, 100 + i * 19, t, 12, '#1B1B1B', 'left', 1)));

    // ── Right: Expectations ───────────────────────────────────────────────
    els.push(txt(960, 80, 'Expectation:', 14, '#1B1B1B', 'left', 2));
    ['• Shorten/Avoid Outages', '• SLA Improvements', '• Proactive / Predictive',
        '• Increase Visibility', '• Agility Improvements',
        '• Customer Experiences', '• Top-Down Troubleshooting',
    ].forEach((t, i) => els.push(txt(960, 100 + i * 19, t, 12, '#1B1B1B', 'left', 1)));

    // ── Stakeholder personas bar ───────────────────────────────────────────
    // Curved banner — approximate with a rounded rect
    els.push(...box(160, 65, 770, 46, '', '#cc0099', '#cc0099', 0));
    // Badge-Pass icons for each stakeholder
    const personas = [
        { label: 'SOC', x: 210 },
        { label: 'NOC', x: 380 },
        { label: 'BOC', x: 550 },
        { label: 'OT',  x: 720 },
    ];
    personas.forEach(({ label, x }) => {
        const fid = addIcon('Badge-Pass', '#ffffff');
        if (fid) els.push(imgEl(fid, x, 32, 40, 40));
        els.push(txt(x, 72, label, 14, '#ffffff', 'center', 2));
    });
    // Notable Events badge
    els.push(...box(162, 58, 76, 34, '', '#ff66bb', '#ff66bb', 0));
    els.push(txt(167, 62, 'Notable\nEvents', 9, '#ffffff', 'center', 2));

    // "ANALYZE" label on bar
    els.push(txt(620, 72, 'ANALYZE', 13, '#ffffff', 'left', 2));

    // Resilience banner (hot pink bar)
    els.push(...box(160, 111, 770, 28, '', '#cc0099', '#cc0099', 0));
    els.push(txt(165, 117,
        'Security Resilience  |  IT Operations Resilience  |  Business Service Resilience',
        11, '#ffffff', 'left', 1));

    // ── Main platform oval / large rounded rect ────────────────────────────
    // Outer light oval shape (simulate with very rounded rect)
    const platEl = {
        id: nanoid(), type: 'rectangle',
        x: 155, y: 140, width: 780, height: 260,
        angle: 0, strokeColor: '#aaaaaa', backgroundColor: '#f9f9f9',
        fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid',
        roughness: 0, opacity: 100, groupIds: [], frameId: null,
        roundness: { type: 3 }, seed: 0, versionNonce: 0, isDeleted: false,
        boundElements: null, updated: 1, link: null, locked: false,
    };
    els.push(platEl);

    // "The Splunk Platform" label (orange, centered)
    els.push(txt(390, 330, 'The Splunk Platform', 18, '#f47c20', 'center', 2));

    // Capabilities strip inside oval
    const caps = ['Streaming', 'Machine Learning', 'Scalable Index', 'Search and\nVisualization', 'Collaboration and\nOrchestration'];
    caps.forEach((c, i) => {
        const cx = 175 + i * 152;
        els.push({
            id: nanoid(), type: 'line',
            x: cx, y: 355, width: 0, height: 30,
            angle: 0, strokeColor: '#cccccc', backgroundColor: 'transparent',
            fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid',
            roughness: 0, opacity: 100, groupIds: [], frameId: null,
            roundness: null, seed: 0, versionNonce: 0, isDeleted: false,
            boundElements: null, updated: 1, link: null, locked: false,
            points: [[0, 0], [0, 30]], lastCommittedPoint: null,
        });
        els.push(txt(cx + 4, 358, c, 10, '#555555', 'left', 1));
    });

    // ── Three stages inside the platform ──────────────────────────────────
    // INVESTIGATE
    els.push(txt(185, 148, 'INVESTIGATE', 13, '#1B1B1B', 'left', 2));
    els.push(txt(185, 166, 'ML', 10, '#cc0099', 'left', 2));
    // IDX box (magenta)
    els.push(...box(220, 163, 60, 22, 'IDX', '#cc0099', '#cc0099', 0, 11));
    // Schema of Read with DB icon
    const dbFid = addIcon('Blank-Database', '#555555');
    if (dbFid) els.push(imgEl(dbFid, 185, 188, 32, 32));
    els.push(txt(220, 192, 'Schema of\nRead', 10, '#555555', 'left', 1));
    // Data model grid icon
    const dmFid = addIcon('Data-Management', '#555555');
    if (dmFid) els.push(imgEl(dmFid, 270, 188, 32, 32));
    // CMDB
    const cmFid = addIcon('CMDB', '#555555');
    if (cmFid) els.push(imgEl(cmFid, 315, 188, 32, 32));

    // vertical divider
    els.push({ id: nanoid(), type: 'line', x: 373, y: 148, width: 0, height: 200,
        angle: 0, strokeColor: '#cccccc', backgroundColor: 'transparent',
        fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'dashed', roughness: 0,
        opacity: 100, groupIds: [], frameId: null, roundness: null, seed: 0,
        versionNonce: 0, isDeleted: false, boundElements: null, updated: 1,
        link: null, locked: false, points: [[0, 0], [0, 200]], lastCommittedPoint: null });

    // MONITOR & OBSERVE
    els.push(txt(395, 148, 'MONITOR &\nOBSERVE', 13, '#1B1B1B', 'left', 2));
    // Eye / Search & Correlate icon
    const srchFid = addIcon('Advanced-Search', '#cc0099');
    if (srchFid) els.push(imgEl(srchFid, 405, 188, 50, 50));
    els.push(txt(405, 244, 'Search &\nCorrelate', 10, '#555555', 'left', 1));
    // No Sampling text box (magenta outline)
    els.push(...box(465, 185, 130, 55, '', '#cc0099', 'transparent', 1.5));
    els.push(txt(470, 192, 'No Sampling Real-time\n& Historical Data\nPlatform', 9, '#333333', 'left', 1));
    // Fields / Events labels
    els.push(txt(480, 163, 'Fields', 9, '#777777', 'left', 1));
    els.push(txt(530, 163, 'Events', 9, '#777777', 'left', 1));

    // vertical divider
    els.push({ id: nanoid(), type: 'line', x: 610, y: 148, width: 0, height: 200,
        angle: 0, strokeColor: '#cccccc', backgroundColor: 'transparent',
        fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'dashed', roughness: 0,
        opacity: 100, groupIds: [], frameId: null, roundness: null, seed: 0,
        versionNonce: 0, isDeleted: false, boundElements: null, updated: 1,
        link: null, locked: false, points: [[0, 0], [0, 200]], lastCommittedPoint: null });

    // ACT & CONTROL
    els.push(txt(625, 148, 'ACT &\nCONTROL', 13, '#1B1B1B', 'left', 2));
    const adapFid = addIcon('Adaptive-Response', '#cc0099');
    if (adapFid) els.push(imgEl(adapFid, 635, 185, 50, 50));
    els.push(txt(635, 240, 'Collaborative Automated\nIncident Response', 9, '#555555', 'left', 1));
    els.push(txt(700, 163, 'OAR', 10, '#777777', 'left', 2));
    // Dashboard + Alert icons
    const dashFid = addIcon('Dashboard', '#555555');
    if (dashFid) els.push(imgEl(dashFid, 720, 185, 36, 36));
    const alertFid = addIcon('Alert', '#cc0099');
    if (alertFid) els.push(imgEl(alertFid, 760, 185, 36, 36));
    const autoFid = addIcon('Automation', '#555555');
    if (autoFid) els.push(imgEl(autoFid, 800, 185, 36, 36));

    // ── Dark Data (left of platform) ──────────────────────────────────────
    els.push(txt(25, 280, 'Dark Data', 13, '#1B1B1B', 'center', 2));
    // Donut chart approximation
    els.push({ id: nanoid(), type: 'ellipse', x: 30, y: 298, width: 80, height: 80,
        angle: 0, strokeColor: '#cc0099', backgroundColor: '#cc0099',
        fillStyle: 'solid', strokeWidth: 0, strokeStyle: 'solid', roughness: 0,
        opacity: 100, groupIds: [], frameId: null, roundness: { type: 3 }, seed: 0,
        versionNonce: 0, isDeleted: false, boundElements: null, updated: 1, link: null, locked: false });
    els.push({ id: nanoid(), type: 'ellipse', x: 46, y: 314, width: 48, height: 48,
        angle: 0, strokeColor: '#f9f9f9', backgroundColor: '#f9f9f9',
        fillStyle: 'solid', strokeWidth: 0, strokeStyle: 'solid', roughness: 0,
        opacity: 100, groupIds: [], frameId: null, roundness: { type: 3 }, seed: 0,
        versionNonce: 0, isDeleted: false, boundElements: null, updated: 1, link: null, locked: false });
    els.push(txt(55, 330, '>50%', 10, '#1B1B1B', 'center', 2));

    // Arrow from dark data into platform
    els.push(...arrow(110, 340, 155, 290, ''));

    // ── Data types row (below platform) ───────────────────────────────────
    const dtypes = ['Metrics', 'Traces', 'Logs', 'Events'];
    dtypes.forEach((d, i) => {
        els.push(txt(265 + i * 145, 415, d, 18, '#1B1B1B', 'center', 2));
        // Binary icon stub
        els.push(txt(260 + i * 145, 438, '0101\n1010\n0101', 8, '#999999', 'left', 1));
    });

    // ── Hot-pink bottom banner ─────────────────────────────────────────────
    els.push(...box(0, 462, 1140, 32, '', '#cc0099', '#cc0099', 0));
    els.push(txt(10, 469,
        'Machine Data  >  Open Standards-based Open Telemetry Collection and Instrumentation',
        13, '#ffffff', 'left', 2));

    // ── Bottom data-source icons row ──────────────────────────────────────
    const sources = [
        { label: 'Transportation', icon: null },
        { label: 'Production',     icon: null },
        { label: 'Sensors',        icon: null },
        { label: 'Security',       icon: 'Badge-Pass' },
        { label: 'Communications', icon: 'Cell-Phone-Devices' },
        { label: 'Networks',       icon: 'Datacenter' },
        { label: 'IT Infrastructure', icon: 'Datacenter' },
        { label: 'Smartphones\nand Devices', icon: 'Cell-Phone-Devices' },
        { label: 'Virtual\nMachines', icon: 'Datacenter' },
        { label: 'Databases',      icon: 'Databases' },
        { label: 'Web Server',     icon: 'Applications' },
        { label: 'Custom\nApplications', icon: 'Custom-Applications' },
        { label: 'Cloud',          icon: 'Cloud' },
        { label: 'Container',      icon: 'Container' },
        { label: 'IBM\nOpenWhisk', icon: null },
        { label: 'AWS\nLambda',    icon: 'Cloud' },
        { label: 'GCP\nFunctions', icon: 'Cloud' },
        { label: 'Azure\nFunctions', icon: 'Cloud' },
    ];

    const colW = 62;
    sources.forEach(({ label, icon }, i) => {
        const sx = 4 + i * colW;
        if (icon) {
            const fid = addIcon(icon, '#333333');
            if (fid) els.push(imgEl(fid, sx + 11, 498, 38, 38));
        } else {
            // Placeholder box
            els.push(...box(sx + 8, 498, 42, 38, '', '#cccccc', '#f5f5f5', 1));
        }
        els.push(txt(sx, 540, label, 8, '#333333', 'center', 1));
    });

    return { elements: els, files };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Splunk Network Port Diagram
// ─────────────────────────────────────────────────────────────────────────────
function buildNetworkPortDiagram() {
    const els = [];

    // ── low-level primitives ────────────────────────────────────────────────

    function rect(x, y, w, h, opts = {}) {
        els.push({
            id: nanoid(), type: 'rectangle',
            x, y, width: w, height: h, angle: 0,
            strokeColor: opts.stroke || '#1B1B1B',
            backgroundColor: opts.fill || 'transparent',
            fillStyle: 'solid',
            strokeWidth: opts.sw || 2,
            strokeStyle: opts.dash ? 'dashed' : 'solid',
            roughness: 0, opacity: 100,
            groupIds: [], frameId: null,
            roundness: { type: 3 },
            seed: 0, versionNonce: 0, isDeleted: false,
            boundElements: null, updated: 1, link: null, locked: false,
        });
    }

    function label(x, y, text, size, color, align = 'left', family = 2) {
        const w = Math.max(text.length * size * 0.62, 40);
        els.push({
            id: nanoid(), type: 'text',
            x, y, width: w, height: size * 1.4,
            text, fontSize: size, fontFamily: family,
            textAlign: align, verticalAlign: 'top', baseline: size,
            angle: 0, strokeColor: color, backgroundColor: 'transparent',
            fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid',
            roughness: 0, opacity: 100,
            groupIds: [], frameId: null, roundness: null,
            seed: 0, versionNonce: 0, isDeleted: false,
            boundElements: null, updated: 1, link: null, locked: false,
            containerId: null, originalText: text, lineHeight: 1.25,
        });
    }

    // Coloured zone background
    function zone(x, y, w, h, heading, fillColor, strokeColor) {
        rect(x, y, w, h, { stroke: strokeColor, fill: fillColor, sw: 2, dash: true });
        label(x + 10, y + 6, heading, 11, strokeColor, 'left', 2);
    }

    // Component box with title + optional subtitle
    function comp(x, y, w, h, title2, sub, fillColor, strokeColor) {
        rect(x, y, w, h, { stroke: strokeColor, fill: fillColor, sw: 2 });
        const titleY = sub ? y + 10 : y + (h - 18) / 2;
        label(x + w / 2 - Math.max(title2.length * 8, 40) / 2, titleY, title2, 13, strokeColor, 'center', 2);
        if (sub) {
            label(x + w / 2 - Math.max(sub.length * 6.2, 40) / 2, y + 30, sub, 10, '#666666', 'center', 1);
        }
    }

    // Arrow with port-label badge
    function portArrow(x1, y1, x2, y2, port, color = '#1B1B1B', dashed = false, bidir = false) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        els.push({
            id: nanoid(), type: 'arrow',
            x: x1, y: y1, width: dx, height: dy, angle: 0,
            strokeColor: color, backgroundColor: 'transparent',
            fillStyle: 'solid', strokeWidth: 2,
            strokeStyle: dashed ? 'dashed' : 'solid',
            roughness: 0, opacity: 100,
            groupIds: [], frameId: null,
            roundness: { type: 2 },
            seed: 0, versionNonce: 0, isDeleted: false,
            boundElements: null, updated: 1, link: null, locked: false,
            points: [[0, 0], [dx, dy]],
            lastCommittedPoint: null,
            startBinding: null, endBinding: null,
            startArrowhead: bidir ? 'arrow' : null,
            endArrowhead: 'arrow',
        });
        if (port) {
            const badgeW = port.length * 6.5 + 10;
            const bx = (x1 + x2) / 2 - badgeW / 2;
            const by = (y1 + y2) / 2 - 18;
            rect(bx - 2, by - 1, badgeW + 4, 16, { stroke: color, fill: '#ffffff', sw: 1 });
            label(bx + 1, by, port, 10, color, 'left', 2);
        }
    }

    // ── Title ───────────────────────────────────────────────────────────────
    label(20, 15, 'Splunk Network Port Diagram', 22, '#1B1B1B', 'left', 2);
    label(1590, 19, 'Splunk Enterprise v9.x', 12, '#888888', 'left', 1);

    // ── Zone backgrounds ────────────────────────────────────────────────────
    zone(20,  50, 250, 790, 'DATA SOURCES',            '#e3f2fd', '#1565c0');
    zone(290, 50, 250, 790, 'FORWARDER LAYER',         '#e8f5e9', '#2e7d32');
    zone(560, 50,1040, 790, 'SPLUNK CORE INFRASTRUCTURE', '#fff3e0', '#e65100');
    zone(1620, 50, 200, 790, 'USERS / ANALYSTS',       '#f3e5f5', '#6a1b9a');

    // ── Data Sources ────────────────────────────────────────────────────────
    comp( 30, 100, 230, 65, 'Linux / Windows Servers', 'UF installed (agent)',      '#e3f2fd', '#1565c0');
    comp( 30, 240, 230, 65, 'Network Devices',          'Syslog · Netflow · SNMP',  '#e3f2fd', '#1565c0');
    comp( 30, 380, 230, 65, 'Applications / REST APIs', 'HTTP Event Collector',     '#e3f2fd', '#1565c0');
    comp( 30, 520, 230, 65, 'Cloud / IoT / Containers', 'AWS S3 · Kinesis · custom','#e3f2fd', '#1565c0');
    comp( 30, 660, 230, 65, 'Third-Party / Stream', 'Cribl · Kafka · syslog-ng', '#e3f2fd', '#1565c0');

    // ── Forwarders ──────────────────────────────────────────────────────────
    comp(300, 100, 230, 65, 'Universal Forwarder 1', 'Lightweight — no indexing', '#e8f5e9', '#2e7d32');
    comp(300, 240, 230, 65, 'Universal Forwarder 2', '(remote site / DMZ)',       '#e8f5e9', '#2e7d32');
    comp(300, 380, 230, 65, 'Heavy Forwarder',       'Parses · filters · routes', '#e8f5e9', '#2e7d32');

    // ── Splunk Core — Management row ────────────────────────────────────────
    comp( 575,  65, 195, 55, 'Deployment Server',  'Manages UF/HF configs',    '#fff3e0', '#e65100');
    comp( 790,  65, 195, 55, 'Cluster Manager',    'Indexer cluster master',   '#fff3e0', '#e65100');
    comp(1005,  65, 195, 55, 'License Manager',    'License pooling',          '#fff3e0', '#e65100');
    label(575, 128, '↑ All components listen on TCP/8089  (Management / REST API)', 10, '#888888', 'left', 1);

    // ── Indexer Cluster zone ─────────────────────────────────────────────────
    rect(575, 155, 620, 130, { stroke: '#e65100', fill: '#fff8f2', sw: 2, dash: true });
    label(580, 158, 'Indexer Cluster  (replication: TCP/8080 · TCP/9887)', 10, '#e65100', 'left', 2);

    comp( 585, 175, 175, 95, 'Indexer 1', 'recv: TCP/9997  web: TCP/8000', '#fff3e0', '#e65100');
    comp( 780, 175, 175, 95, 'Indexer 2', 'recv: TCP/9997  web: TCP/8000', '#fff3e0', '#e65100');
    comp( 975, 175, 175, 95, 'Indexer 3', 'recv: TCP/9997  web: TCP/8000', '#fff3e0', '#e65100');

    // Indexer peer replication (bidirectional)
    portArrow(760, 222, 780, 222, 'TCP/8080 · 9887', '#cc3300', false, true);
    portArrow(955, 222, 975, 222, 'TCP/8080 · 9887', '#cc3300', false, true);

    // ── Search Head Cluster zone ─────────────────────────────────────────────
    rect(575, 340, 620, 130, { stroke: '#6a1b9a', fill: '#f8f0ff', sw: 2, dash: true });
    label(580, 343, 'Search Head Cluster  (replication: TCP/8181 · TCP/9887  |  KV Store: TCP/8191)', 10, '#6a1b9a', 'left', 2);

    comp( 585, 360, 175, 95, 'Search Head 1', 'web: TCP/8000  KV: TCP/8065', '#f3e5f5', '#6a1b9a');
    comp( 780, 360, 175, 95, 'Search Head 2', 'web: TCP/8000  KV: TCP/8065', '#f3e5f5', '#6a1b9a');
    comp( 990, 360, 180, 55, 'SHC Deployer',  'Pushes apps to SH members',   '#ede8ff', '#6a1b9a');

    // SHC replication (bidirectional)
    portArrow(760, 407, 780, 407, 'TCP/8181 · 9887', '#6a1b9a', false, true);
    // SH → KV Store note
    label(990, 425, 'KV Store: TCP/8191\n(internal replication)', 10, '#6a1b9a', 'left', 1);

    // ── HEC receiver box ────────────────────────────────────────────────────
    comp(575, 530, 240, 55, 'HTTP Event Collector (HEC)', 'Indexer or Heavy Forwarder · TCP/8088', '#fff3e0', '#e65100');

    // ── Reference notes ──────────────────────────────────────────────────────
    label(575, 605, 'Reference — commonly used ports', 12, '#1B1B1B', 'left', 2);
    const notes = [
        '🔵  TCP/9997   Forwarder → Indexer (data forwarding)',
        '🟠  TCP/8088   HTTP Event Collector (HEC)',
        '🔑  TCP/8089   Management / REST API (all components)',
        '🌐  TCP/8000   Splunk Web (browser access)',
        '🔄  TCP/8080 · 9887  Indexer cluster peer replication',
        '🔄  TCP/8181 · 9887  Search Head cluster replication',
        '🗄  TCP/8191   KV Store (SHC internal)',
        '🔒  TCP/9998   SSL/TLS encrypted forwarding (UF/HF ↔ Indexer)',
        '📡  UDP/514 · TCP/1514  Syslog ingestion (→ HF or SC4S)',
    ];
    notes.forEach((n, i) => label(575, 626 + i * 18, n, 11, '#444444', 'left', 1));

    // ── Users ────────────────────────────────────────────────────────────────
    comp(1630, 360, 175, 60, 'Browser / Analyst',  'Splunk Web UI',          '#f3e5f5', '#6a1b9a');
    comp(1630, 450, 175, 60, 'REST API Client',     'curl · SDK · Phantom',   '#f3e5f5', '#6a1b9a');
    comp(1630, 540, 175, 60, 'Monitoring Console',  'Admin overview',         '#f3e5f5', '#6a1b9a');
    comp(1630, 630, 175, 60, 'Splunk SOAR / ITSM',  'Automated response',     '#f3e5f5', '#6a1b9a');

    // ── Arrows: Data Sources → Forwarders ────────────────────────────────────
    // Linux/Windows Servers → UF1 (agent is installed — no network arrow needed, use note)
    label(262, 122, 'agent', 9, '#2e7d32', 'left', 1);
    portArrow(260, 132, 300, 132, '',          '#2e7d32');  // Servers → UF1
    portArrow(260, 272, 300, 272, 'UDP/514',   '#1565c0');  // Network → HF (syslog goes to HF)
    portArrow(260, 412, 575, 552, 'TCP/8088',  '#e65100');  // Apps → HEC (direct)
    portArrow(260, 552, 300, 412, 'TCP/9997',  '#2e7d32');  // Cloud → HF
    portArrow(260, 692, 300, 430, 'TCP/9997',  '#2e7d32');  // 3rd party → HF

    // Redirect network devices syslog to heavy forwarder
    portArrow(300, 272, 300, 395, '',          '#2e7d32');  // align network device arrow down to HF

    // ── Arrows: Forwarders → Indexers ────────────────────────────────────────
    portArrow(530, 132, 585, 210, 'TCP/9997',  '#e65100');  // UF1 → Idx1
    portArrow(530, 272, 672, 210, 'TCP/9997',  '#e65100');  // UF2 → Idx2
    portArrow(530, 412, 760, 222, 'TCP/9997',  '#e65100');  // HF → Idx2

    // ── Arrows: UF ↔ Deployment Server ───────────────────────────────────────
    portArrow(530, 120, 575,  92, 'TCP/8089',  '#888888', true, true);  // UF1 ↔ DS

    // ── Arrows: Search Heads → Indexers (distributed search) ─────────────────
    portArrow(672, 360, 672, 270, 'TCP/8089',  '#6a1b9a');  // SH1 → Idx1
    portArrow(867, 360, 867, 270, 'TCP/8089',  '#6a1b9a');  // SH2 → Idx2

    // ── Arrows: Users → Splunk ───────────────────────────────────────────────
    portArrow(1630, 390, 1195, 390, 'TCP/8000',  '#6a1b9a');   // Browser → SH1
    portArrow(1630, 480, 1195, 407, 'TCP/8089',  '#888888', true); // REST → SH
    portArrow(1630, 570, 985,   92, 'TCP/8089',  '#888888', true); // MC → Cluster Mgr

    return els;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Edge Processor Overview
// ─────────────────────────────────────────────────────────────────────────────
function buildEdgeProcessorOverview() {
    const els = [];

    // ── primitives ──────────────────────────────────────────────────────────
    const ORANGE  = '#F96901';
    const MGENTA  = '#b31c8d';
    const DARK    = '#1B1B1B';
    const GRAY    = '#555555';
    const LGRAY   = '#e8e8e8';
    const MGRAY   = '#d0d0d0';

    function r(x, y, w, h, opts = {}) {
        els.push({
            id: nanoid(), type: 'rectangle',
            x, y, width: w, height: h, angle: 0,
            strokeColor: opts.stroke || DARK,
            backgroundColor: opts.fill || 'transparent',
            fillStyle: 'solid',
            strokeWidth: opts.sw !== undefined ? opts.sw : 2,
            strokeStyle: opts.dash ? 'dashed' : 'solid',
            roughness: 0, opacity: 100,
            groupIds: [], frameId: null,
            roundness: { type: 3 },
            seed: 0, versionNonce: 0, isDeleted: false,
            boundElements: null, updated: 1, link: null, locked: false,
        });
    }

    function e(x, y, w, h, opts = {}) {
        els.push({
            id: nanoid(), type: 'ellipse',
            x, y, width: w, height: h, angle: 0,
            strokeColor: opts.stroke || DARK,
            backgroundColor: opts.fill || 'transparent',
            fillStyle: 'solid',
            strokeWidth: opts.sw !== undefined ? opts.sw : 2,
            strokeStyle: 'solid',
            roughness: 0, opacity: 100,
            groupIds: [], frameId: null,
            roundness: { type: 3 },
            seed: 0, versionNonce: 0, isDeleted: false,
            boundElements: null, updated: 1, link: null, locked: false,
        });
    }

    function t(x, y, text, size, color = DARK, align = 'left', family = 1) {
        const w = Math.max(text.length * size * 0.63, 30);
        els.push({
            id: nanoid(), type: 'text',
            x, y, width: w, height: size * 1.4,
            text, fontSize: size, fontFamily: family,
            textAlign: align, verticalAlign: 'top', baseline: size,
            angle: 0, strokeColor: color, backgroundColor: 'transparent',
            fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid',
            roughness: 0, opacity: 100,
            groupIds: [], frameId: null, roundness: null,
            seed: 0, versionNonce: 0, isDeleted: false,
            boundElements: null, updated: 1, link: null, locked: false,
            containerId: null, originalText: text, lineHeight: 1.25,
        });
    }

    // Arrow with optional mid-label; bidirectional if bidir=true
    function arr(x1, y1, x2, y2, lbl = '', color = DARK, dashed = false, bidir = false) {
        const dx = x2 - x1, dy = y2 - y1;
        els.push({
            id: nanoid(), type: 'arrow',
            x: x1, y: y1, width: dx, height: dy, angle: 0,
            strokeColor: color, backgroundColor: 'transparent',
            fillStyle: 'solid', strokeWidth: 3,
            strokeStyle: dashed ? 'dashed' : 'solid',
            roughness: 0, opacity: 100,
            groupIds: [], frameId: null,
            roundness: { type: 2 },
            seed: 0, versionNonce: 0, isDeleted: false,
            boundElements: null, updated: 1, link: null, locked: false,
            points: [[0, 0], [dx, dy]],
            lastCommittedPoint: null,
            startBinding: null, endBinding: null,
            startArrowhead: bidir ? 'arrow' : null,
            endArrowhead: 'arrow',
        });
        if (lbl) {
            const lw = lbl.length * 7 + 6;
            t((x1 + x2) / 2 - lw / 2, (y1 + y2) / 2 - 17, lbl, 12, color, 'left', 2);
        }
    }

    // Document icon (rectangle body + 3 text lines inside)
    function doc(x, y) {
        r(x, y, 56, 68, { stroke: DARK, fill: '#ffffff', sw: 2 });
        // "folded corner" triangle suggestion via thin lines
        r(x + 5, y + 12, 46, 4, { stroke: MGRAY, fill: MGRAY, sw: 0 });
        r(x + 5, y + 22, 46, 4, { stroke: MGRAY, fill: MGRAY, sw: 0 });
        r(x + 5, y + 32, 46, 4, { stroke: MGRAY, fill: MGRAY, sw: 0 });
        r(x + 5, y + 42, 30, 4, { stroke: MGRAY, fill: MGRAY, sw: 0 });
        t(x + 6, y + 4, '≡', 16, DARK, 'left', 1);
    }

    // Cylinder (database/log barrel)
    function cylinder(x, y, w, h, lines) {
        const eh = 18;
        // body
        r(x, y + eh / 2, w, h - eh / 2, { stroke: GRAY, fill: LGRAY, sw: 2 });
        // bottom ellipse cap
        e(x, y + h - eh / 2, w, eh, { stroke: GRAY, fill: LGRAY, sw: 2 });
        // top ellipse cap (covers top of body rect)
        e(x, y, w, eh, { stroke: GRAY, fill: '#c8c8c8', sw: 2 });
        // text lines
        lines.forEach((line, i) => t(x + w / 2 - line.length * 5.5, y + eh + 8 + i * 17, line, 11, DARK, 'center', 1));
    }

    // ── Title ────────────────────────────────────────────────────────────────
    t(20, 15, 'Edge Processor Overview', 28, DARK, 'left', 2);

    // ── USER (top-left) ───────────────────────────────────────────────────────
    // Magenta-to-orange gradient circle → approximate with two-tone ring
    e(22, 148, 108, 108, { stroke: MGENTA, fill: '#fdf0fb', sw: 3 });
    // person icon (simple shapes)
    e(60, 164, 30, 28, { stroke: DARK, fill: '#ffffff', sw: 2 });   // head
    r(48, 194, 52, 38, { stroke: DARK, fill: '#ffffff', sw: 2 });   // body
    t(52, 168, '👤', 22, DARK, 'left', 1);
    t(55, 265, 'User', 13, DARK, 'center', 2);

    // ── ARROW: User → Splunk Platform ────────────────────────────────────────
    arr(130, 202, 220, 202, '', ORANGE);

    // ── SPLUNK PLATFORM BOX ────────────────────────────────────────────────────
    r(220, 148, 555, 188, { stroke: GRAY, fill: LGRAY, sw: 2 });
    t(230, 157, 'Splunk Platform', 16, DARK, 'left', 2);

    // UI small box (inside, left)
    r(305, 180, 52, 112, { stroke: GRAY, fill: MGRAY, sw: 2 });
    t(314, 232, 'UI', 13, DARK, 'center', 2);

    // Services inner zone
    r(368, 178, 280, 114, { stroke: GRAY, fill: '#f0f0f0', sw: 1 });
    // Pipelines Service
    r(375, 185, 265, 44, { stroke: GRAY, fill: '#ffffff', sw: 2 });
    t(450, 200, 'Pipelines Service', 13, DARK, 'center', 2);
    // Edge Processor Service
    r(375, 237, 265, 44, { stroke: GRAY, fill: '#ffffff', sw: 2 });
    t(430, 252, 'Edge Processor Service', 13, DARK, 'center', 2);

    // Cylinder — audit / processor logs (right of services)
    cylinder(658, 178, 100, 114, ['Audit logs', 'Processor logs', 'Pipeline metrics']);

    // ── BULLET POINTS (right of Splunk Platform box) ─────────────────────────
    t(790, 188, '•  Central pipeline', 13, DARK, 'left', 1);
    t(798, 206, '   management', 13, DARK, 'left', 1);
    t(790, 236, '•  Global visibility', 13, DARK, 'left', 1);

    // ── "Cloud or Customer Managed" label ────────────────────────────────────
    t(268, 348, 'Cloud or Customer Managed', 12, DARK, 'left', 2);

    // ── BIDIRECTIONAL VERTICAL ARROW (Platform ↔ Host Server) ────────────────
    // Goes from below Splunk Platform down to Customer Host Server top
    arr(484, 345, 484, 408, '', ORANGE, false, true);

    // ── BOTTOM TIER outer boxes ───────────────────────────────────────────────

    // Customer Agents outer box
    r(20, 408, 240, 188, { stroke: GRAY, fill: '#f8f8f8', sw: 2 });
    // 3 document icons
    doc(30, 420);
    doc(102, 420);
    doc(174, 420);
    t(42, 550, 'Customer Agents', 14, DARK, 'left', 2);

    // DATA arrow 1
    arr(260, 492, 348, 492, 'Data', ORANGE);

    // Customer Host Server box
    r(348, 408, 282, 188, { stroke: DARK, fill: '#f8f8f8', sw: 2 });
    // Edge Processor Node inner box
    r(362, 440, 254, 70, { stroke: GRAY, fill: '#e0e0e0', sw: 2 });
    t(405, 467, 'Edge Processor Node', 13, DARK, 'center', 2);
    t(370, 555, 'Customer Host Server', 14, DARK, 'left', 2);

    // DATA arrow 2
    arr(630, 492, 718, 492, 'Data', ORANGE);

    // Customer Destinations box
    r(718, 408, 315, 188, { stroke: GRAY, fill: '#f8f8f8', sw: 2 });

    // Splunk Cloud icon block
    e(738, 428, 52, 40, { stroke: ORANGE, fill: '#fff3e0', sw: 2 });
    t(738, 430, '☁', 20, ORANGE, 'left', 1);
    t(733, 474, 'splunk>', 10, DARK, 'left', 2);
    t(733, 487, 'Cloud', 10, GRAY, 'left', 1);

    // Splunk Enterprise icon block
    r(808, 428, 52, 40, { stroke: '#65a637', fill: '#f0fff0', sw: 2 });
    t(810, 432, '🗄', 20, '#65a637', 'left', 1);
    t(804, 474, 'splunk>', 10, DARK, 'left', 2);
    t(804, 487, 'Enterprise', 10, GRAY, 'left', 1);

    // AWS S3 icon block
    r(878, 428, 52, 40, { stroke: '#FF9900', fill: '#fffbf0', sw: 2 });
    t(880, 432, '☁', 20, '#FF9900', 'left', 1);
    t(882, 474, 'aws', 10, '#FF9900', 'left', 2);
    t(882, 487, 'S3', 10, GRAY, 'left', 1);

    t(730, 553, 'Customer Destinations', 14, DARK, 'left', 2);

    // ── FOOTER link ──────────────────────────────────────────────────────────
    t(20, 618, 'Link: Edge Processor Validated Architecture | Splunk Docs', 11, '#1a73e8', 'left', 1);
    t(20, 633, 'https://docs.splunk.com/Documentation/SplunkCloud/latest/Edge/AboutEdgeProcessor', 10, '#888888', 'left', 1);

    return els;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Splunk Platform (whiteboard) — pre-tagged with a 13-step PowerPoint-style build.
//  Recreated from the "Whiteboard Splunk 2022" deck (one slide, 13 click builds).
//  Each step is an Excalidraw group carrying customData.build.step so it reveals
//  one click at a time in Present mode.
// ─────────────────────────────────────────────────────────────────────────────
function buildSplunkPlatform() {
    const els = [];

    // Tag a step's elements with a shared group id + build step, then collect them.
    function step(n, ...parts) {
        const gid = nanoid();
        const flat = parts.flat(Infinity).filter(Boolean);
        flat.forEach((e) => {
            e.groupIds = [gid];
            e.customData = { build: { step: n } };
        });
        els.push(...flat);
    }

    const INK = '#1B1B1B';
    const SUB = '#555555';
    const PINK = '#cc0099';

    // ── Step 1: title + Client ───────────────────────────────────────────────
    step(
        1,
        txt(470, 18, 'Splunk Platform', 24, PINK, 'left', 2),
        box(560, 64, 150, 38, 'Client', INK, 'transparent', 2, 14),
        arrow(635, 102, 635, 128, '')
    );

    // ── Step 2: connection ports row ─────────────────────────────────────────
    step(
        2,
        box(432, 128, 96, 34, '8000', INK, '#eaf4ff', 1.5, 12),
        box(534, 128, 96, 34, '8089', INK, '#eaffea', 1.5, 12),
        box(636, 128, 96, 34, '9997', INK, '#fff3e0', 1.5, 12),
        box(738, 128, 96, 34, '8088', INK, '#fdeaff', 1.5, 12),
        txt(432, 166, 'Web   ·   Mgmt   ·   Forward   ·   HEC', 10, SUB, 'left', 1)
    );

    // ── Step 3: Apps band ────────────────────────────────────────────────────
    step(
        3,
        box(420, 188, 420, 34, 'Apps', INK, '#f3f0ff', 2, 14),
        arrow(630, 222, 630, 246, '')
    );

    // ── Step 4: platform container ───────────────────────────────────────────
    step(4, box(240, 246, 820, 300, '', INK, 'transparent', 2.5));

    // ── Steps 5–8: the four stages ───────────────────────────────────────────
    step(5, stageBox(258, 270, 188, 252, 'INVESTIGATE', 'SCHEMA\nON READ'));
    step(6, stageBox(456, 270, 184, 252, 'MONITOR', ''), arrow(446, 396, 456, 396, ''));
    step(7, stageBox(650, 270, 184, 252, 'ANALYZE', ''), arrow(640, 396, 650, 396, ''));
    step(8, stageBox(844, 270, 198, 252, 'ACT', ''), arrow(834, 396, 844, 396, ''));

    // ── Step 9: Machine Data band ────────────────────────────────────────────
    step(
        9,
        box(240, 562, 820, 40, 'Machine Data', INK, '#efefef', 2, 14),
        arrow(650, 562, 650, 546, '')
    );

    // ── Step 10: data source icons row ───────────────────────────────────────
    const sources = ['syslog', 'metrics', 'logs', 'cloud', 'database', 'API', 'mobile', 'IoT'];
    step(
        10,
        ...sources.map((s, i) => box(252 + i * 100, 618, 88, 34, s, INK, '#ffffff', 1.5, 11))
    );

    // ── Step 11: Dark Data callout ───────────────────────────────────────────
    step(
        11,
        box(120, 330, 110, 56, 'Dark Data', '#7a3cb8', '#f6efff', 2, 12),
        arrow(230, 358, 258, 380, 'illuminate')
    );

    // ── Step 12: Initiatives (left) ──────────────────────────────────────────
    const initiatives = [
        'Fingerpointing',
        'Service uptime',
        'Weniger Incidents',
        'Azure & AWS',
        'Schnellere Detektion',
        'Tools',
    ];
    step(
        12,
        txt(20, 60, 'Initiatives', 15, PINK, 'left', 2),
        ...initiatives.map((t, i) => txt(20, 86 + i * 22, '↑ ' + t, 12, INK, 'left', 1))
    );

    // ── Step 13: Outcomes / Expectations (right) ─────────────────────────────
    const outcomes = [
        'Effizienz, weniger',
        'manuelle Arbeit',
        'MTTR ↓',
        'Business Value',
        'Stabilere Infrastruktur',
        'End-to-End Visibility',
    ];
    step(
        13,
        txt(1080, 60, 'Outcomes', 15, PINK, 'left', 2),
        ...outcomes.map((t, i) => txt(1080, 86 + i * 22, '• ' + t, 12, INK, 'left', 1))
    );

    return els;
}

export const TEMPLATES = [
    {
        id: 'splunk-platform',
        name: 'Splunk Platform (13-step build)',
        description: 'Client → ports → Apps → Investigate/Monitor/Analyze/Act → Machine Data → sources, with Initiatives & Outcomes. Pre-tagged for PowerPoint-style reveal in Present mode.',
        build: buildSplunkPlatform,
    },
    {
        id: 'edge-processor',
        name: 'Edge Processor Overview',
        description: 'User → Splunk Platform (UI, Pipelines, EP Service, audit logs) ↕ Edge Processor Node → Customer Destinations (Cloud, Enterprise, S3)',
        build: buildEdgeProcessorOverview,
    },
    {
        id: 'network-ports',
        name: 'Splunk Network Port Diagram',
        description: 'Full port reference: UF/HF → Indexers (9997), HEC (8088), Search Heads (8000/8089), cluster replication, management API',
        build: buildNetworkPortDiagram,
    },
    {
        id: 'drp',
        name: 'Digital Resilience Platform',
        description: 'SOC/NOC/BOC/OT → Investigate→Monitor→Act on Splunk Platform with data source icons',
        build: buildDRP,
    },
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
