import React from 'react';
import layout from '@splunk/react-page';
import { SplunkThemeProvider } from '@splunk/themes';

import AboutPage from './components/AboutPage';
import { detectSplunkColorScheme } from './lib/splunkTheme';

const colorScheme = detectSplunkColorScheme();

layout(
    <SplunkThemeProvider family="enterprise" colorScheme={colorScheme} density="compact">
        <AboutPage />
    </SplunkThemeProvider>,
    { hideFooter: true, hideAppBar: false }
);
