import React from 'react';
import Button from '@splunk/react-ui/Button';
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import { TEMPLATES } from '../templates';

export default function TemplatePanel({ onApply }) {
    const apply = (tpl) => {
        // eslint-disable-next-line no-alert
        if (!window.confirm(`Replace the current board with the "${tpl.name}" template?`)) {
            return;
        }
        const result = tpl.build();
        // Template builders may return { elements, files } or a plain elements array
        if (Array.isArray(result)) {
            onApply(result, []);
        } else {
            onApply(result.elements, result.files || []);
        }
    };

    return (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Heading level={3}>Use case templates</Heading>
            <P>Replaces the current canvas. Save your work first if needed.</P>
            {TEMPLATES.map((tpl) => (
                <div
                    key={tpl.id}
                    style={{
                        border: '1px solid var(--gray60, #c3cbd4)',
                        borderRadius: 4,
                        padding: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                    }}
                >
                    <strong>{tpl.name}</strong>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>{tpl.description}</span>
                    <Button appearance="primary" onClick={() => apply(tpl)}>
                        Apply
                    </Button>
                </div>
            ))}
        </div>
    );
}
