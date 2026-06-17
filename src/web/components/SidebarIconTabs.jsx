import React from 'react';

/**
 * Compact vertical icon tab strip for the right sidebar.
 * Uses native title tooltips on hover.
 */
export default function SidebarIconTabs({ tabs, activeTab, onChange, children }) {
    return (
        <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
            <nav
                aria-label="Side panel"
                style={{
                    width: 42,
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    padding: '6px 4px',
                    borderRight: '1px solid var(--gray60, #c3cbd4)',
                    background: 'var(--gray98, #fafbfc)',
                }}
            >
                {tabs.map((tab) => {
                    const active = tab.value === activeTab;
                    const Icon = tab.Icon;
                    return (
                        <button
                            key={tab.value}
                            type="button"
                            title={tab.label}
                            aria-label={tab.label}
                            aria-current={active ? 'page' : undefined}
                            onClick={() => onChange(tab.value)}
                            style={{
                                all: 'unset',
                                boxSizing: 'border-box',
                                width: 34,
                                height: 34,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 6,
                                cursor: 'pointer',
                                color: active ? '#5a4fcf' : 'var(--color-on-background, #1b1b1b)',
                                background: active ? 'rgba(90, 79, 207, 0.12)' : 'transparent',
                                border: active
                                    ? '2px solid #5a4fcf'
                                    : '2px solid transparent',
                                transition: 'background 0.12s, border-color 0.12s',
                            }}
                            onMouseEnter={(e) => {
                                if (!active) {
                                    e.currentTarget.style.background = 'var(--gray90, #e2e6ea)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!active) {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                        >
                            <Icon width={18} height={18} />
                        </button>
                    );
                })}
            </nav>
            <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>{children}</div>
        </div>
    );
}
