import React, { useState } from 'react';
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Link from '@splunk/react-ui/Link';
import Card from '@splunk/react-ui/Card';
import Button from '@splunk/react-ui/Button';
import Message from '@splunk/react-ui/Message';
import Text from '@splunk/react-ui/Text';

import { APP_VERSION } from '../lib/version';
import { README_URL, DEVELOPER_URL, RELEASE_NOTES_URL, GITHUB_REPO } from '../lib/appLinks';
import { purgeAllWhiteboardData } from '../lib/cleanup';

const WHITEBOARD_URL = '/en-US/app/whiteboard_app/whiteboard';

const sectionStyle = { marginTop: 28 };
const listStyle = { margin: '8px 0 0', paddingLeft: 20, lineHeight: 1.7 };
const mutedListStyle = { ...listStyle, opacity: 0.9 };

function Kbd({ children }) {
    return (
        <code
            style={{
                fontFamily: 'monospace',
                fontSize: 12,
                padding: '1px 5px',
                borderRadius: 4,
                border: '1px solid currentColor',
                opacity: 0.85,
            }}
        >
            {children}
        </code>
    );
}

const CONFIRM_WORD = 'DELETE';

function CleanupSection() {
    const [expanded, setExpanded] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    const reset = () => {
        setExpanded(false);
        setConfirmText('');
    };

    const runPurge = async () => {
        if (confirmText.trim().toUpperCase() !== CONFIRM_WORD) return;
        // Final browser-level gate on top of the typed confirmation.
        if (!window.confirm(
            'This permanently deletes ALL whiteboards, history, thumbnails and shared '
            + 'content in this app. This cannot be undone. Continue?'
        )) {
            return;
        }
        setBusy(true);
        setResult(null);
        try {
            const { errors } = await purgeAllWhiteboardData();
            if (errors.length) {
                setResult({
                    type: 'warning',
                    text: `Cleanup finished with ${errors.length} issue(s): ${errors.join('; ')}`,
                });
            } else {
                setResult({
                    type: 'success',
                    text: 'All whiteboard data was deleted. You can now safely uninstall the app.',
                });
            }
            reset();
        } catch (e) {
            setResult({ type: 'error', text: `Cleanup failed: ${e.message}` });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card style={{ marginTop: 28, border: '1px solid #dc2626' }}>
            <Card.Header title="Danger zone — reset or delete all data" />
            <Card.Body>
                <P style={{ margin: 0 }}>
                    Permanently delete <strong>all whiteboard content</strong> from this instance:
                    every board (shared and your private ones), version history, snapshots, preview
                    thumbnails, and any legacy template data. Use this to clean up KV Store{' '}
                    <strong>before uninstalling</strong>, or to <strong>reset the app to factory
                    defaults</strong>. <strong>This cannot be undone.</strong>
                </P>
                <P style={{ marginBottom: 0, opacity: 0.75, fontSize: 13 }}>
                    The built-in <strong>starter boards</strong> ship in the app and are not stored in
                    KV Store, so they remain available after a reset. Clears all shared boards for
                    every user plus your own private boards; other users&apos; private boards are
                    removed automatically when an admin uninstalls the app.
                </P>

                {result && (
                    <Message
                        type={result.type}
                        onRequestRemove={() => setResult(null)}
                        style={{ marginTop: 12 }}
                    >
                        {result.text}
                    </Message>
                )}

                {!expanded ? (
                    <Button
                        appearance="destructive"
                        onClick={() => { setResult(null); setExpanded(true); }}
                        style={{ marginTop: 12 }}
                    >
                        Delete all whiteboard data…
                    </Button>
                ) : (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <P style={{ margin: 0, fontSize: 13 }}>
                            Type <code>{CONFIRM_WORD}</code> to confirm:
                        </P>
                        <Text
                            value={confirmText}
                            onChange={(_, { value }) => setConfirmText(value)}
                            placeholder={CONFIRM_WORD}
                            disabled={busy}
                            style={{ maxWidth: 220 }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Button
                                appearance="destructive"
                                onClick={runPurge}
                                disabled={busy || confirmText.trim().toUpperCase() !== CONFIRM_WORD}
                            >
                                {busy ? 'Deleting…' : 'Delete everything'}
                            </Button>
                            <Button appearance="secondary" onClick={reset} disabled={busy}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
}

export default function AboutPage() {
    return (
        <div style={{ padding: 24, maxWidth: 820 }}>
            <Heading level={1}>Splunk Whiteboard App</Heading>
            <P style={{ marginTop: 12 }}>
                Draw architecture diagrams, workshop sketches, and presentation flows{' '}
                <strong>inside Splunk</strong> — powered by{' '}
                <Link to="https://excalidraw.com" openInNewContext>
                    Excalidraw
                </Link>
                , the open-source infinite canvas. Boards live in Splunk KV Store, so there is no
                external whiteboard service and no separate login.
            </P>
            <P style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 13, opacity: 0.8 }}>
                Version {APP_VERSION}
            </P>

            {/* TL;DR ---------------------------------------------------------- */}
            <Card style={{ marginTop: 20 }}>
                <Card.Header title="TL;DR — the basics" />
                <Card.Body>
                    <ol style={listStyle}>
                        <li>
                            <strong>Build a whiteboard.</strong> Open the app and start drawing on a
                            blank Excalidraw canvas — rectangles, arrows, text, freehand. Everything{' '}
                            <strong>auto-saves</strong> every few seconds.
                        </li>
                        <li>
                            <strong>Use shapes &amp; libraries.</strong> Add Splunk infrastructure
                            shapes, marketing icons, and brand logos from the <strong>Shapes</strong>{' '}
                            tab, or import community sets from the <strong>Libraries</strong> tab.
                        </li>
                        <li>
                            <strong>Group &amp; assign order.</strong> Group elements with{' '}
                            <Kbd>Ctrl</Kbd>+<Kbd>G</Kbd>, then use the <strong>Build</strong> tab to
                            assign a reveal order for a step-by-step story.
                        </li>
                        <li>
                            <strong>Present.</strong> Click <strong>Present</strong> to reveal each
                            step on click (<Kbd>→</Kbd> / <Kbd>Space</Kbd> forward, <Kbd>←</Kbd> back,{' '}
                            <Kbd>Esc</Kbd> to exit).
                        </li>
                    </ol>
                </Card.Body>
            </Card>

            {/* Get started --------------------------------------------------- */}
            <div style={sectionStyle}>
                <Heading level={2}>Get started</Heading>
                <ol style={listStyle}>
                    <li>
                        Open <strong>Apps → Whiteboard App</strong> (or go to{' '}
                        <Link to={WHITEBOARD_URL}>the whiteboard view</Link>).
                    </li>
                    <li>
                        On first use you land on an empty canvas. Otherwise, pick a board from the
                        list or click <strong>Create board</strong>.
                    </li>
                    <li>Draw with the Excalidraw toolbar — your work auto-saves.</li>
                </ol>
            </div>

            {/* Drawing & shapes ---------------------------------------------- */}
            <div style={sectionStyle}>
                <Heading level={2}>Drawing, shapes &amp; libraries</Heading>
                <ul style={mutedListStyle}>
                    <li>
                        <strong>Toolbar:</strong> Select <Kbd>V</Kbd>, Text <Kbd>T</Kbd>, Rectangle{' '}
                        <Kbd>R</Kbd>, Arrow <Kbd>A</Kbd>, Free-draw <Kbd>P</Kbd>. Double-click a shape
                        to label it; hold <Kbd>Shift</Kbd> to constrain angles.
                    </li>
                    <li>
                        <strong>Shapes tab:</strong> Splunk infrastructure shapes (insert as editable
                        elements or colourable SVG icons), 50 marketing icons, and brand logos.
                    </li>
                    <li>
                        <strong>Libraries tab:</strong> browse{' '}
                        <Link to="https://libraries.excalidraw.com" openInNewContext>
                            libraries.excalidraw.com
                        </Link>
                        , import a set, then drag shapes from Excalidraw&apos;s library panel.
                    </li>
                    <li>
                        <strong>Starter boards:</strong> the board list ships ready-made architecture
                        diagrams — click <strong>Use</strong> to create your own editable copy, or{' '}
                        <strong>Duplicate</strong> any board to branch off it.
                    </li>
                </ul>
            </div>

            {/* Group, order & present ---------------------------------------- */}
            <div style={sectionStyle}>
                <Heading level={2}>Group, assign order &amp; present</Heading>
                <ul style={mutedListStyle}>
                    <li>
                        Group related elements with <Kbd>Ctrl</Kbd>+<Kbd>G</Kbd> so they reveal and
                        move together.
                    </li>
                    <li>
                        In the <strong>Build</strong> tab, add selections as steps or use{' '}
                        <strong>Auto</strong> (by group, left→right, top→bottom). Reorder with ↑/↓.
                    </li>
                    <li>
                        Click <strong>Present</strong> for a progressive reveal. Toggle{' '}
                        <strong>Fade</strong> and <strong>Follow</strong> from the presentation bar.
                        Presenting never changes your saved board.
                    </li>
                </ul>
            </div>

            {/* Export & sharing ---------------------------------------------- */}
            <div style={sectionStyle}>
                <Heading level={2}>Export &amp; sharing</Heading>
                <ul style={mutedListStyle}>
                    <li>
                        <strong>Export tab:</strong> download board JSON (backup / move between
                        instances), PNG, or PDF, and generate Dashboard Studio JSON.
                    </li>
                    <li>
                        <strong>Visibility:</strong> boards default to <strong>Just me</strong>{' '}
                        (private). Open a board and choose <strong>Share with everyone</strong> to make
                        it visible to all users on the instance. Shareable links work for shared boards.
                    </li>
                    <li>
                        <strong>History tab:</strong> save named snapshots and restore earlier
                        versions.
                    </li>
                </ul>
            </div>

            {/* Docs links ---------------------------------------------------- */}
            <div style={sectionStyle}>
                <Heading level={2}>Documentation</Heading>
                <ul style={mutedListStyle}>
                    <li>
                        <Link to={README_URL} openInNewContext>
                            Full user guide (README)
                        </Link>
                    </li>
                    <li>
                        <Link to={RELEASE_NOTES_URL} openInNewContext>
                            Release notes
                        </Link>
                    </li>
                    <li>
                        <Link to={DEVELOPER_URL} openInNewContext>
                            Developer guide (build, deploy, extend)
                        </Link>
                    </li>
                    <li>
                        <Link to={GITHUB_REPO} openInNewContext>
                            Project on GitHub
                        </Link>
                    </li>
                </ul>
            </div>

            {/* Danger zone --------------------------------------------------- */}
            <CleanupSection />
        </div>
    );
}
