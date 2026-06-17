import React, { useRef, useState } from 'react';
import Button from '@splunk/react-ui/Button';
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Message from '@splunk/react-ui/Message';
import TextArea from '@splunk/react-ui/TextArea';

import { exportCanvasToPDF } from '../lib/exportPDF';
import { buildDashboardStudioJSON } from '../lib/toDashboardStudio';
import { buildBoardBundle, parseBoardBundle } from '../lib/boardBundle';
import { buildShareLink } from '../lib/url';

async function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(blob);
    });
}

function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

function downloadText(text, name) {
    downloadBlob(new Blob([text], { type: 'application/json' }), name);
}

export default function ExportPanel({
    boardId,
    boardName,
    appVersion,
    getExportable,
    getBoardState,
    onImportBoard,
}) {
    const [status, setStatus] = useState(null);
    const [dsJson, setDsJson] = useState('');
    const fileRef = useRef(null);

    const safeName = (boardName || 'whiteboard').replace(/[^a-zA-Z0-9._-]+/g, '_');

    const exportPng = async () => {
        try {
            setStatus(null);
            const { blob } = await getExportable();
            downloadBlob(blob, `${safeName}.png`);
        } catch (e) {
            setStatus({ type: 'error', text: e.message });
        }
    };

    const exportPdf = async () => {
        try {
            setStatus(null);
            const { blob } = await getExportable();
            await exportCanvasToPDF(blob, `${safeName}.pdf`);
        } catch (e) {
            setStatus({ type: 'error', text: e.message });
        }
    };

    const copyLink = async () => {
        if (!boardId) return;
        try {
            await navigator.clipboard.writeText(buildShareLink(boardId));
            setStatus({ type: 'success', text: 'Shareable link copied to clipboard.' });
        } catch (e) {
            setStatus({ type: 'error', text: 'Clipboard blocked: ' + e.message });
        }
    };

    const exportBoardJson = () => {
        try {
            setStatus(null);
            if (!getBoardState) throw new Error('Canvas not ready');
            const { elements, appState, files } = getBoardState();
            const bundle = buildBoardBundle({
                name: boardName,
                elements,
                appState,
                files,
                appVersion,
            });
            downloadText(JSON.stringify(bundle, null, 2), `${safeName}.whiteboard.json`);
            setStatus({
                type: 'success',
                text: 'Board JSON downloaded — re-import with Import board JSON below.',
            });
        } catch (e) {
            setStatus({ type: 'error', text: e.message });
        }
    };

    const triggerImport = () => fileRef.current?.click();

    const handleImportFile = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        try {
            setStatus(null);
            const text = await file.text();
            const parsed = parseBoardBundle(text);
            if (!window.confirm(
                `Import ${parsed.elements.length} elements${parsed.name ? ` from "${parsed.name}"` : ''}? `
                + 'This replaces the current canvas.'
            )) {
                return;
            }
            await onImportBoard(parsed);
            setStatus({
                type: 'success',
                text: `Imported ${parsed.elements.length} elements. Save to persist.`,
            });
        } catch (err) {
            setStatus({ type: 'error', text: err.message });
        }
    };

    const exportDashboardStudio = async () => {
        try {
            setStatus(null);
            const { blob, width, height } = await getExportable();
            const dataUrl = await blobToDataUrl(blob);
            const json = buildDashboardStudioJSON({
                title: boardName,
                pngDataUrl: dataUrl,
                width,
                height,
            });
            const text = JSON.stringify(json, null, 2);
            setDsJson(text);
            setStatus({
                type: 'info',
                text: 'Copy the JSON below and paste it into Dashboard Studio → Source.',
            });
        } catch (e) {
            setStatus({ type: 'error', text: e.message });
        }
    };

    return (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Heading level={3}>Export</Heading>

            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', opacity: 0.6 }}>
                Board backup
            </div>
            <Button appearance="primary" onClick={exportBoardJson} disabled={!getBoardState}>
                Download board JSON
            </Button>
            <Button onClick={triggerImport} disabled={!onImportBoard}>
                Import board JSON…
            </Button>
            <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={handleImportFile}
            />
            <P style={{ fontSize: 11, margin: 0, opacity: 0.7 }}>
                App-native format for backup or moving boards between Splunk instances.
                Includes elements, canvas settings, and embedded images.
            </P>

            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', opacity: 0.6, marginTop: 4 }}>
                Images &amp; share
            </div>
            <Button appearance="primary" onClick={exportPng}>
                Download PNG
            </Button>
            <Button appearance="primary" onClick={exportPdf}>
                Download PDF
            </Button>
            <Button onClick={copyLink}>Copy shareable link</Button>

            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', opacity: 0.6, marginTop: 4 }}>
                Dashboard Studio
            </div>
            <Button onClick={exportDashboardStudio}>Dashboard Studio JSON</Button>
            {dsJson && (
                <TextArea
                    value={dsJson}
                    rowsMin={6}
                    rowsMax={12}
                    onChange={() => {}}
                    style={{ fontFamily: 'monospace', fontSize: 11 }}
                />
            )}
            <P style={{ fontSize: 11, opacity: 0.7, margin: 0 }}>
                Dashboard Studio embeds the canvas as a PNG inside a
                <code> splunk.image </code> panel.
            </P>

            {status && <Message type={status.type}>{status.text}</Message>}
        </div>
    );
}
