import React from 'react';
import layout from '@splunk/react-page';
import { SplunkThemeProvider } from '@splunk/themes';

import App from './components/App';
import { detectSplunkColorScheme } from './lib/splunkTheme';
import { debug } from './lib/log';

const BUNDLE_VERSION = '0.3.5';
debug(`bundle ${BUNDLE_VERSION} loaded at ${new Date().toISOString()}`);

const colorScheme = detectSplunkColorScheme();

layout(
    <SplunkThemeProvider family="enterprise" colorScheme={colorScheme} density="compact">
        <App initialColorScheme={colorScheme} />
    </SplunkThemeProvider>,
    { hideFooter: true, hideAppBar: false }
);
