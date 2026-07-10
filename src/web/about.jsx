import React from 'react';
import layout from '@splunk/react-page';
import { SplunkThemeProvider } from '@splunk/themes';

import AboutPage from './components/AboutPage';
import { resolveSplunkThemeOptions } from './lib/splunkTheme';

resolveSplunkThemeOptions().then((themeOptions) => {
    layout(
        <SplunkThemeProvider {...themeOptions}>
            <AboutPage />
        </SplunkThemeProvider>,
        { hideFooter: true, hideAppBar: false }
    );
});
