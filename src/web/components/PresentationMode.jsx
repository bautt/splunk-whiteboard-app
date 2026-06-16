import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '@splunk/react-ui/Button';

// Collects "frame" elements drawn on the canvas and steps through them as a slideshow.
// Excalidraw exposes frames as elements with type === 'frame'. If the board has none,
// the whole canvas is treated as a single frame.
export default function PresentationMode({ excalidrawAPI, onExit }) {
    const [index, setIndex] = useState(0);

    const frames = useMemo(() => {
        if (!excalidrawAPI) return [];
        const elements = excalidrawAPI.getSceneElements() || [];
        return elements.filter((e) => e.type === 'frame');
    }, [excalidrawAPI]);

    const total = Math.max(frames.length, 1);

    const goToFrame = useCallback(
        (i) => {
            if (!excalidrawAPI) return;
            const safe = ((i % total) + total) % total;
            setIndex(safe);
            const frame = frames[safe];
            if (frame) {
                excalidrawAPI.scrollToContent([frame], { fitToContent: true });
            } else {
                excalidrawAPI.scrollToContent(undefined, { fitToContent: true });
            }
        },
        [excalidrawAPI, frames, total]
    );

    useEffect(() => {
        goToFrame(0);
    }, [goToFrame]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                goToFrame(index + 1);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goToFrame(index - 1);
            } else if (e.key === 'Escape') {
                onExit();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [goToFrame, index, onExit]);

    useEffect(() => {
        const el = document.documentElement;
        if (el.requestFullscreen) {
            el.requestFullscreen().catch(() => {});
        }
        return () => {
            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
        };
    }, []);

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 999,
                background: 'var(--bgColor, #fff)',
                borderRadius: 8,
                padding: '8px 12px',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
        >
            <Button size="small" onClick={() => goToFrame(index - 1)}>
                ← Prev
            </Button>
            <span style={{ minWidth: 60, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                {frames.length > 0 ? `${index + 1} / ${total}` : 'Whole canvas'}
            </span>
            <Button size="small" onClick={() => goToFrame(index + 1)}>
                Next →
            </Button>
            <Button size="small" appearance="destructive" onClick={onExit}>
                Exit (Esc)
            </Button>
        </div>
    );
}
