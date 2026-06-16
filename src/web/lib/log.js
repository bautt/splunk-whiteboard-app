// Lightweight debug logger.
//
// Debug output is OFF by default so production consoles stay clean (and we never
// risk logging payload details in a shipped app). Enable at runtime from the
// browser console with:  localStorage.setItem('wb_debug', '1')  then reload.
//
// Errors/warnings are always surfaced via logError / logWarn.

let DEBUG = false;
try {
    DEBUG = typeof localStorage !== 'undefined' && localStorage.getItem('wb_debug') === '1';
} catch (e) {
    DEBUG = false;
}

const PREFIX = '[whiteboard_app]';

export function debug(...args) {
    if (DEBUG) {
        // eslint-disable-next-line no-console
        console.log(PREFIX, ...args);
    }
}

export function logWarn(...args) {
    // eslint-disable-next-line no-console
    console.warn(PREFIX, ...args);
}

export function logError(...args) {
    // eslint-disable-next-line no-console
    console.error(PREFIX, ...args);
}
