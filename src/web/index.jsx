import React from 'react';
import layout from '@splunk/react-page';
import { SplunkThemeProvider } from '@splunk/themes';

import App from './components/App';
import { resolveSplunkThemeOptions } from './lib/splunkTheme';
import { debug } from './lib/log';
import { APP_VERSION } from './lib/version';

debug(`bundle ${APP_VERSION} loaded at ${new Date().toISOString()}`);

// Read the real Splunk Web theme before mounting so react-ui components always
// match the surrounding page (and stay readable) regardless of the OS setting.
resolveSplunkThemeOptions().then((themeOptions) => {
    layout(
        <SplunkThemeProvider {...themeOptions}>
            <App initialColorScheme={themeOptions.colorScheme} />
        </SplunkThemeProvider>,
        { hideFooter: true, hideAppBar: false }
    );
});
