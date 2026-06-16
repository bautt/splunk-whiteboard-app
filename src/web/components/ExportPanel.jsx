import React, { useState } from 'react';
import Button from '@splunk/react-ui/Button';
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Message from '@splunk/react-ui/Message';
import TextArea from '@splunk/react-ui/TextArea';

import { exportCanvasToPDF } from '../lib/exportPDF';
import { buildDashboardStudioJSON } from '../lib/toDashboardStudio';
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

export default function ExportPanel({ boardId, boardName, getExportable }) {
    const [status, setStatus] = useState(null);
    const [dsJson, setDsJson] = useState('');

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
            <Button appearance="primary" onClick={exportPng}>
                Download PNG
            </Button>
            <Button appearance="primary" onClick={exportPdf}>
                Download PDF
            </Button>
            <Button onClick={copyLink}>Copy shareable link</Button>
            <Button onClick={exportDashboardStudio}>Dashboard Studio JSON</Button>
            {status && <Message type={status.type}>{status.text}</Message>}
            {dsJson && (
                <TextArea
                    value={dsJson}
                    rowsMin={6}
                    rowsMax={12}
                    onChange={() => {}}
                    style={{ fontFamily: 'monospace', fontSize: 11 }}
                />
            )}
            <P style={{ fontSize: 11, opacity: 0.7 }}>
                Dashboard Studio: the PNG is embedded as a data URL inside a
                <code> splunk.image </code> panel. Big boards make big JSON.
            </P>
        </div>
    );
}
