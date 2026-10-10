/*
 * Splunk's shared config: Airbnb + React + hooks + jsx-a11y, with 4-space
 * indentation — which is what this codebase already uses. The scattered
 * `eslint-disable` comments (no-await-in-loop, react-hooks/exhaustive-deps)
 * were written against this rule set; the config itself was just never
 * committed.
 */
module.exports = {
    root: true,
    // The `-prettier` variant switches off every purely cosmetic rule. There is
    // no Prettier here; the point is that formatting stays unenforced, so the
    // linter reports substance instead of 800 fixable whitespace complaints.
    extends: '@splunk/eslint-config/browser-prettier',
    settings: {
        // React 17: no automatic JSX runtime, components import React explicitly.
        react: { version: '17' },
    },
    rules: {
        // This codebase does not use PropTypes anywhere — flagging all 147 call
        // sites would be a redesign, not a lint finding.
        'react/prop-types': 'off',
        // Guard clauses are written inline throughout (`if (!api) return;`).
        // Still require braces once a statement spans lines, where omitting
        // them actually misleads.
        curly: ['error', 'multi-line'],

        // Helper `function` declarations sit below the component that uses
        // them, which reads top-down and is safe because declarations hoist.
        // Let-/const-/class bindings do not hoist, so those stay errors.
        'no-use-before-define': ['error', { functions: false, classes: true, variables: true }],

        // Airbnb bans `for...of` because it used to pull in regenerator-runtime.
        // This app targets evergreen browsers through webpack 5, so it does not.
        'no-restricted-syntax': [
            'error',
            'ForInStatement',
            'LabeledStatement',
            'WithStatement',
        ],

        // `_key` and `_user` are Splunk KV store's own field names, not ours.
        'no-underscore-dangle': ['error', { allow: ['_key', '_user'] }],

        // Airbnb's list, plus: writing `.current` on a ref handed in as a prop
        // is the React contract for that prop, not an accidental mutation.
        'no-param-reassign': [
            'error',
            {
                props: true,
                ignorePropertyModificationsFor: [
                    'acc',
                    'accumulator',
                    'e',
                    'ctx',
                    'req',
                    'request',
                    'res',
                    'response',
                    '$scope',
                    'staticContext',
                ],
                ignorePropertyModificationsForRegex: ['Ref$'],
            },
        ],
    },
};
