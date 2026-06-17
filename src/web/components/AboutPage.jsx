import React from 'react';
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import Link from '@splunk/react-ui/Link';

import { APP_VERSION } from '../lib/version';
import { README_URL } from '../lib/appLinks';

export default function AboutPage() {
    return (
        <div style={{ padding: 24, maxWidth: 720 }}>
            <Heading level={1}>Splunk Whiteboard App</Heading>
            <P style={{ marginTop: 16 }}>
                Collaborative whiteboard for Splunk platform and use case design — built with
                React and Excalidraw, persisted via Splunk KV Store.
            </P>
            <P style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 14 }}>
                Version {APP_VERSION}
            </P>
            <P style={{ marginTop: 16 }}>
                <Link to={README_URL} openInNewContext>
                    Documentation (README on GitHub)
                </Link>
            </P>
        </div>
    );
}
