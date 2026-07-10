/**
 * Starter boards shipped with the app (from assets/prebuilt-templates/).
 *
 * These are immutable, in-bundle boards. Opening one always CLONES it into a
 * new private board (see BoardListPage), so app upgrades that refresh these
 * bundles never touch a user's saved copy.
 *
 * Regenerate the underlying bundles: python3 scripts/export-kv-templates.py
 */
import { sanitizeElementsForPersistence } from './build';

import plattformWbDark from '../../../assets/prebuilt-templates/plattform-wb-dark.whiteboard.json';
import dataFabric from '../../../assets/prebuilt-templates/data-fabric.whiteboard.json';
import dataFabricMdl from '../../../assets/prebuilt-templates/data-fabric-mdl.whiteboard.json';
import svaC3c13ShcSingleSite from '../../../assets/prebuilt-templates/sva-c3c13-shc-single-site.whiteboard.json';
import svaC1c11SingleSite from '../../../assets/prebuilt-templates/sva-c1c11-single-site.whiteboard.json';

function fromBundle(bundle, overrides = {}) {
    const board = bundle.board || {};
    // Starter boards may declare an intended canvas appearance (theme +
    // background). Shipped bundles currently persist an empty appState, so
    // allow an explicit override; fall back to whatever the bundle stored.
    const appState = overrides.appState
        ?? (Object.keys(board.appState || {}).length ? board.appState : null);
    return {
        id: overrides.id ?? bundle.id,
        label: overrides.label ?? bundle.name,
        description: overrides.description ?? bundle.description ?? '',
        elements: sanitizeElementsForPersistence(board.elements || []),
        files: board.files || [],
        appState,
    };
}

export const STARTER_BOARDS = [
    // Splunk Platform on a dark charcoal canvas.
    fromBundle(plattformWbDark, {
        id: 'plattform-wb-dark',
        label: 'Splunk Platform (dark)',
        description: 'Splunk platform architecture on a dark charcoal canvas.',
        appState: { theme: 'dark', displayBackgroundColor: '#1e1e1e' },
    }),
    // Same Splunk Platform board on a light warm canvas.
    fromBundle(plattformWbDark, {
        id: 'plattform-wb-light',
        label: 'Splunk Platform (light)',
        description: 'Splunk platform architecture on a light warm canvas.',
        appState: { theme: 'light', displayBackgroundColor: '#faf8f5' },
    }),
    // Cisco Data Fabric boards render on a dark charcoal canvas.
    fromBundle(dataFabric, {
        appState: { theme: 'dark', displayBackgroundColor: '#1e1e1e' },
    }),
    fromBundle(dataFabricMdl, {
        appState: { theme: 'dark', displayBackgroundColor: '#1e1e1e' },
    }),
    fromBundle(svaC3c13ShcSingleSite, {
        appState: {
            theme: 'light',
            displayBackgroundColor: '#ffffff',
            viewBackgroundColor: '#ffffff',
        },
    }),
    fromBundle(svaC1c11SingleSite, {
        appState: {
            theme: 'light',
            displayBackgroundColor: '#ffffff',
            viewBackgroundColor: '#ffffff',
        },
    }),
];

export default STARTER_BOARDS;
