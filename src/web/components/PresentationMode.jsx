import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '@splunk/react-ui/Button';
import Switch from '@splunk/react-ui/Switch';
import {
    getMaxStep,
    getStep,
    hasBuild,
    computeReveal,
    restoreSnapshot,
} from '../lib/build';

const FADE_MS = 240;

// Presentation overlay. Two modes, auto-selected from the scene:
//  1. Build mode  — if elements carry build steps (customData.build.step),
//     each click reveals the next step (PowerPoint-style), with optional
//     fade-in and camera-follow. The scene is restored untouched on exit.
//  2. Frame mode  — otherwise, step through Excalidraw frames as slides.
export default function PresentationMode({ excalidrawAPI, onExit, suppressSaveRef }) {
    const [index, setIndex] = useState(0);
    const [fade, setFade] = useState(true);
    // Camera-follow is off by default: the whole board is framed once on entry
    // and stays put as steps reveal (like PowerPoint). Toggle on to pan/zoom to
    // each newly revealed step instead.
    const [follow, setFollow] = useState(false);

    // Immutable snapshot of the scene at entry — never mutated, used to derive
    // every reveal view and to restore the board on exit.
    const snapshotRef = useRef(null);
    const fadeRafRef = useRef(null);

    if (snapshotRef.current === null && excalidrawAPI) {
        snapshotRef.current = excalidrawAPI.getSceneElements() || [];
    }

    const snapshot = snapshotRef.current || [];
    const buildMode = useMemo(() => hasBuild(snapshot), [snapshot]);
    const maxStep = useMemo(() => getMaxStep(snapshot), [snapshot]);

    const frames = useMemo(
        () => (buildMode ? [] : snapshot.filter((e) => e.type === 'frame')),
        [snapshot, buildMode]
    );

    // Total navigable stops.
    const totalStops = buildMode ? maxStep + 1 : Math.max(frames.length, 1);

    const cancelFade = () => {
        if (fadeRafRef.current) {
            cancelAnimationFrame(fadeRafRef.current);
            fadeRafRef.current = null;
        }
    };

    // ── Build-mode reveal ────────────────────────────────────────────────────
    const revealStep = useCallback(
        (step, { animate }) => {
            const api = excalidrawAPI;
            if (!api) return;
            cancelFade();

            const apply = (fadeFactor) =>
                api.updateScene({
                    elements: computeReveal(snapshot, step, {
                        fadingStep: animate ? step : null,
                        fadeFactor,
                    }),
                });

            if (animate && fade && step > 0) {
                const t0 = performance.now();
                const tick = (now) => {
                    const f = Math.min(1, (now - t0) / FADE_MS);
                    apply(f);
                    if (f < 1) {
                        fadeRafRef.current = requestAnimationFrame(tick);
                    } else {
                        fadeRafRef.current = null;
                    }
                };
                apply(0);
                fadeRafRef.current = requestAnimationFrame(tick);
            } else {
                apply(1);
            }

            if (follow && step > 0) {
                const targets = snapshot.filter((el) => getStep(el) === step);
                if (targets.length) api.scrollToContent(targets, { fitToContent: true });
            } else if (step === 0) {
                api.scrollToContent(undefined, { fitToContent: true });
            }
        },
        [excalidrawAPI, snapshot, fade, follow]
    );

    // ── Frame-mode navigation ────────────────────────────────────────────────
    const goToFrame = useCallback(
        (i) => {
            if (!excalidrawAPI) return;
            const safe = ((i % totalStops) + totalStops) % totalStops;
            setIndex(safe);
            const frame = frames[safe];
            if (frame) excalidrawAPI.scrollToContent([frame], { fitToContent: true });
            else excalidrawAPI.scrollToContent(undefined, { fitToContent: true });
        },
        [excalidrawAPI, frames, totalStops]
    );

    const go = useCallback(
        (delta) => {
            if (buildMode) {
                setIndex((cur) => {
                    const nextStep = Math.max(0, Math.min(maxStep, cur + delta));
                    if (nextStep !== cur) revealStep(nextStep, { animate: delta > 0 });
                    return nextStep;
                });
            } else {
                goToFrame(index + delta);
            }
        },
        [buildMode, maxStep, revealStep, goToFrame, index]
    );

    // Initial view.
    useEffect(() => {
        if (buildMode) revealStep(0, { animate: false });
        else goToFrame(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keyboard.
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
                e.preventDefault();
                go(1);
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                e.preventDefault();
                go(-1);
            } else if (e.key === 'Escape') {
                handleExit();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [go]);

    // Fullscreen on mount.
    useEffect(() => {
        const el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
        return () => {
            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
        };
    }, []);

    // Suppress autosave for the whole presentation lifetime (reveal mutates the
    // live scene; we don't want those transient opacity changes persisted).
    useEffect(() => {
        if (suppressSaveRef) suppressSaveRef.current = true;
        return () => {
            if (suppressSaveRef) {
                // keep suppression briefly after restore so the trailing onChange
                // from restoreSnapshot doesn't mark the board dirty.
                setTimeout(() => {
                    suppressSaveRef.current = false;
                }, 400);
            }
        };
    }, [suppressSaveRef]);

    const handleExit = useCallback(() => {
        cancelFade();
        if (excalidrawAPI && snapshotRef.current) {
            excalidrawAPI.updateScene({ elements: restoreSnapshot(snapshotRef.current) });
        }
        onExit();
    }, [excalidrawAPI, onExit]);

    const statusText = buildMode
        ? `Step ${index} / ${maxStep}`
        : frames.length > 0
        ? `${index + 1} / ${totalStops}`
        : 'Whole canvas';

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
                gap: 10,
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
        >
            <Button size="small" onClick={() => go(-1)}>← Prev</Button>
            <span style={{ minWidth: 80, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                {statusText}
            </span>
            <Button size="small" onClick={() => go(1)}>Next →</Button>

            {buildMode && (
                <>
                    <span style={{ width: 1, height: 22, background: 'var(--gray60, #c3cbd4)' }} />
                    <Switch
                        value="fade"
                        selected={fade}
                        onClick={() => setFade((v) => !v)}
                        appearance="toggle"
                    >
                        Fade
                    </Switch>
                    <Switch
                        value="follow"
                        selected={follow}
                        onClick={() => setFollow((v) => !v)}
                        appearance="toggle"
                    >
                        Follow
                    </Switch>
                </>
            )}

            <Button size="small" appearance="destructive" onClick={handleExit}>
                Exit (Esc)
            </Button>
        </div>
    );
}
