import React, { useCallback, useEffect, useState } from 'react';
import Button from '@splunk/react-ui/Button';
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import {
    DEFAULT_LIGHT_BG,
    displayBackgroundColor,
    EXCALIDRAW_THEME,
    normalizeHexColor,
    normalizeTheme,
    parseColorInput,
    presetsForTheme,
    resolveAppearancePatch,
} from '../lib/canvasAppearance';

const THEME_OPTIONS = [
    { value: EXCALIDRAW_THEME.LIGHT, label: 'Light' },
    { value: EXCALIDRAW_THEME.DARK, label: 'Dark' },
];

export default function AppearancePanel({ canvasAppState, onAppearanceChange }) {
    const theme = normalizeTheme(canvasAppState);
    const storedBg = canvasAppState?.viewBackgroundColor;
    const displayBg = displayBackgroundColor(storedBg, theme);
    const presets = presetsForTheme(theme);
    const [colorText, setColorText] = useState(displayBg);
    const [colorError, setColorError] = useState('');

    useEffect(() => {
        setColorText(displayBg);
        setColorError('');
    }, [displayBg]);

    const apply = useCallback(
        (patch) => {
            if (!onAppearanceChange) return;
            onAppearanceChange(resolveAppearancePatch(patch, canvasAppState));
        },
        [onAppearanceChange, canvasAppState]
    );

    const setTheme = (nextTheme) => {
        apply({ theme: nextTheme });
    };

    const commitColorText = useCallback(() => {
        const parsed = parseColorInput(colorText);
        if (!parsed) {
            setColorError('Use #hex, rgb(r, g, b), or r, g, b');
            return;
        }
        setColorError('');
        setColorText(parsed);
        apply({ displayBackgroundColor: parsed });
    }, [colorText, apply]);

    return (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Heading level={3}>Canvas appearance</Heading>
            <P style={{ fontSize: 12, margin: 0, opacity: 0.75 }}>
                Theme and background are saved with this board. You can also change them from
                the canvas menu (☰).
            </P>

            <div>
                <div style={sectionLabel}>Theme</div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {THEME_OPTIONS.map(({ value, label }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setTheme(value)}
                            style={{
                                ...themeBtn,
                                flex: 1,
                                borderColor:
                                    theme === value ? '#5a4fcf' : 'var(--gray60, #c3cbd4)',
                                background:
                                    theme === value
                                        ? 'rgba(90, 79, 207, 0.1)'
                                        : 'var(--gray98, #fafbfc)',
                                fontWeight: theme === value ? 600 : 400,
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <div style={sectionLabel}>Background</div>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 8,
                        marginBottom: 10,
                    }}
                >
                    {presets.map((preset) => (
                        <button
                            key={preset.id}
                            type="button"
                            title={preset.label}
                            onClick={() =>
                                apply({
                                    displayBackgroundColor: preset.color,
                                    theme:
                                        preset.themes[0] === 'dark'
                                            ? EXCALIDRAW_THEME.DARK
                                            : EXCALIDRAW_THEME.LIGHT,
                                })
                            }
                            style={{
                                ...swatchBtn,
                                background: preset.color,
                                outline:
                                    normalizeHexColor(displayBg) ===
                                    normalizeHexColor(preset.color)
                                        ? '2px solid #5a4fcf'
                                        : '1px solid var(--gray60, #c3cbd4)',
                            }}
                        >
                            <span style={swatchLabel}>{preset.label}</span>
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                        <span style={{ flexShrink: 0 }}>Custom</span>
                        <input
                            type="color"
                            value={toColorInput(displayBg)}
                            onChange={(e) =>
                                apply({ displayBackgroundColor: e.target.value })
                            }
                            style={{
                                width: 40,
                                height: 32,
                                padding: 0,
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        />
                    </label>
                    <input
                        type="text"
                        value={colorText}
                        onChange={(e) => {
                            setColorText(e.target.value);
                            if (colorError) setColorError('');
                        }}
                        onBlur={commitColorText}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                commitColorText();
                            }
                        }}
                        placeholder="#0e37dd or rgb(14, 55, 221)"
                        aria-label="Background color"
                        style={{
                            padding: '6px 8px',
                            fontSize: 12,
                            fontFamily: 'ui-monospace, monospace',
                            border: `1px solid ${colorError ? '#d9534f' : 'var(--gray60, #c3cbd4)'}`,
                            borderRadius: 4,
                            outline: 'none',
                            background: 'var(--gray99, #fff)',
                            color: 'inherit',
                            width: '100%',
                            boxSizing: 'border-box',
                        }}
                    />
                    {colorError ? (
                        <span style={{ fontSize: 11, color: '#d9534f' }}>{colorError}</span>
                    ) : (
                        <span style={{ fontSize: 11, opacity: 0.65 }}>
                            Press Enter or click away to apply
                        </span>
                    )}
                </div>
            </div>

            <Button
                size="small"
                appearance="secondary"
                onClick={() =>
                    apply({
                        theme: EXCALIDRAW_THEME.LIGHT,
                        displayBackgroundColor: DEFAULT_LIGHT_BG,
                    })
                }
            >
                Reset to defaults
            </Button>
        </div>
    );
}

const sectionLabel = {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    opacity: 0.6,
    marginBottom: 8,
};

const themeBtn = {
    all: 'unset',
    cursor: 'pointer',
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid',
    fontSize: 13,
    textAlign: 'center',
};

const swatchBtn = {
    all: 'unset',
    cursor: 'pointer',
    height: 44,
    borderRadius: 6,
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: 4,
};

const swatchLabel = {
    fontSize: 9,
    fontWeight: 600,
    padding: '2px 4px',
    borderRadius: 3,
    background: 'rgba(255,255,255,0.85)',
    color: '#1b1b1b',
    lineHeight: 1.2,
};

function toColorInput(hex) {
    if (!hex || typeof hex !== 'string') return '#ffffff';
    const h = hex.replace('#', '');
    if (h.length === 3) {
        return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
    }
    return h.length === 6 ? `#${h}` : '#ffffff';
}
