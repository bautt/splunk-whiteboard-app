import React from 'react';
import layout from '@splunk/react-page';
import { SplunkThemeProvider } from '@splunk/themes';

import App from './components/App';
import { detectSplunkColorScheme } from './lib/splunkTheme';

const BUNDLE_VERSION = '0.1.2';
// eslint-disable-next-line no-console
console.log(`[whiteboard_app] bundle ${BUNDLE_VERSION} loaded at ${new Date().toISOString()}`);

const colorScheme = detectSplunkColorScheme();

layout(
    <SplunkThemeProvider family="enterprise" colorScheme={colorScheme} density="compact">
        <App initialColorScheme={colorScheme} />
    </SplunkThemeProvider>,
    { hideFooter: true, hideAppBar: false }
);
