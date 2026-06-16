import React from 'react';
import { logError } from '../lib/log';

// Catches rendering errors inside a side panel so a single broken panel
// doesn't blank the whole sidebar. Resets when its key/children prop changes
// (we set key={activeTab} on the parent so each tab gets a fresh boundary).
// Uses a plain styled div instead of @splunk/react-ui/Message so the fallback
// itself can never depend on a component that might be the cause of failure.
export default class PanelErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        logError('panel render error:', error, info);
    }

    render() {
        if (this.state.error) {
            const msg = String(this.state.error.message || this.state.error);
            return (
                <div
                    style={{
                        margin: 12,
                        padding: 12,
                        border: '2px solid #DC4E41',
                        background: '#FFF1F0',
                        color: '#5C0011',
                        borderRadius: 4,
                        fontFamily: 'monospace',
                        fontSize: 12,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                    }}
                >
                    PANEL ERROR: {msg}
                </div>
            );
        }
        return this.props.children;
    }
}
