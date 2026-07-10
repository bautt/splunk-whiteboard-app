import React from 'react';
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Link from '@splunk/react-ui/Link';
import Card from '@splunk/react-ui/Card';

import { APP_VERSION } from '../lib/version';
import { README_URL, DEVELOPER_URL, RELEASE_NOTES_URL, GITHUB_REPO } from '../lib/appLinks';

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
                        <strong>Templates tab:</strong> start from built-in examples or save the
                        current board as a reusable template (theme &amp; background included).
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
        </div>
    );
}
