import React, { useCallback, useState } from 'react';
import Button from '@splunk/react-ui/Button';
import Heading from '@splunk/react-ui/Heading';
import P from '@splunk/react-ui/Paragraph';
import {
    getMaxStep,
    expandToGroups,
    tagStep,
    clearStep,
    autoNumberByGroup,
    swapSteps,
    summarizeSteps,
    getStep,
} from '../lib/build';

// Authoring UI for PowerPoint-style "build" reveal. Lets the presenter assign
// canvas elements/groups to ordered steps that appear one click at a time in
// presentation mode.
export default function BuildPanel({ excalidrawAPI, markDirty }) {
    // Local tick to force a re-read of the scene after each mutation.
    const [, setTick] = useState(0);
    const refresh = useCallback(() => setTick((t) => t + 1), []);

    const elements = excalidrawAPI ? excalidrawAPI.getSceneElements() : [];
    const steps = summarizeSteps(elements);
    const maxStep = getMaxStep(elements);

    const selectedCount = excalidrawAPI
        ? Object.values(excalidrawAPI.getAppState().selectedElementIds || {}).filter(Boolean).length
        : 0;

    const commit = useCallback(
        (next) => {
            excalidrawAPI.updateScene({ elements: next });
            if (markDirty) markDirty();
            refresh();
        },
        [excalidrawAPI, markDirty, refresh]
    );

    const addSelectedAsStep = useCallback(() => {
        if (!excalidrawAPI) return;
        const els = excalidrawAPI.getSceneElements();
        const sel = expandToGroups(els, excalidrawAPI.getAppState().selectedElementIds);
        if (sel.size === 0) return;
        commit(tagStep(els, sel, getMaxStep(els) + 1));
    }, [excalidrawAPI, commit]);

    const autoNumber = useCallback(
        (axis) => {
            if (!excalidrawAPI) return;
            commit(autoNumberByGroup(excalidrawAPI.getSceneElements(), axis));
        },
        [excalidrawAPI, commit]
    );

    const clearAll = useCallback(() => {
        if (!excalidrawAPI) return;
        if (!window.confirm('Remove all build steps? Elements stay on the canvas.')) return;
        commit(clearStep(excalidrawAPI.getSceneElements()));
    }, [excalidrawAPI, commit]);

    const focusStep = useCallback(
        (step) => {
            if (!excalidrawAPI) return;
            const targets = excalidrawAPI.getSceneElements().filter((el) => getStep(el) === step);
            if (targets.length) excalidrawAPI.scrollToContent(targets, { fitToContent: true });
        },
        [excalidrawAPI]
    );

    const removeStep = useCallback(
        (step) => {
            if (!excalidrawAPI) return;
            const els = excalidrawAPI.getSceneElements();
            const ids = els.filter((el) => getStep(el) === step).map((el) => el.id);
            // Untag this step, then renumber the steps above it down by one.
            let next = clearStep(els, ids);
            next = next.map((el) => {
                const s = getStep(el);
                if (s > step) {
                    return {
                        ...el,
                        customData: { ...(el.customData || {}), build: { step: s - 1 } },
                        version: (el.version || 1) + 1,
                    };
                }
                return el;
            });
            commit(next);
        },
        [excalidrawAPI, commit]
    );

    const move = useCallback(
        (step, dir) => {
            const other = step + dir;
            if (other < 1 || other > maxStep) return;
            commit(swapSteps(excalidrawAPI.getSceneElements(), step, other));
        },
        [excalidrawAPI, commit, maxStep]
    );

    return (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Heading level={3}>Build (reveal on click)</Heading>
            <P style={{ fontSize: 12, margin: 0, opacity: 0.75 }}>
                Assign elements to ordered steps. In <strong>Present</strong> mode each
                click reveals the next step, like PowerPoint build animations.
            </P>

            <Button
                appearance="primary"
                disabled={!excalidrawAPI || selectedCount === 0}
                onClick={addSelectedAsStep}
            >
                {selectedCount > 0
                    ? `Add selection as step ${maxStep + 1} (${selectedCount})`
                    : 'Select elements to add a step'}
            </Button>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Button size="small" disabled={!excalidrawAPI} onClick={() => autoNumber('z')}>
                    Auto: by group
                </Button>
                <Button size="small" disabled={!excalidrawAPI} onClick={() => autoNumber('x')}>
                    Auto: left→right
                </Button>
                <Button size="small" disabled={!excalidrawAPI} onClick={() => autoNumber('y')}>
                    Auto: top→bottom
                </Button>
                <Button size="small" disabled={!excalidrawAPI} onClick={() => autoNumber('y-rev')}>
                    Auto: bottom→top
                </Button>
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', opacity: 0.6 }}>
                {steps.length > 0 ? `${steps.length} step${steps.length !== 1 ? 's' : ''}` : 'No steps yet'}
            </div>

            {steps.map(({ step, count }) => (
                <div
                    key={step}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        border: '1px solid var(--gray60, #c3cbd4)',
                        borderRadius: 6,
                        padding: '6px 8px',
                    }}
                >
                    <span
                        style={{
                            flexShrink: 0,
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: '#5a4fcf',
                            color: '#fff',
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {step}
                    </span>
                    <span style={{ flex: 1, fontSize: 12 }}>
                        {count} element{count !== 1 ? 's' : ''}
                    </span>
                    <button title="Move earlier" onClick={() => move(step, -1)} style={iconBtn}>↑</button>
                    <button title="Move later" onClick={() => move(step, +1)} style={iconBtn}>↓</button>
                    <button title="Focus on canvas" onClick={() => focusStep(step)} style={iconBtn}>⊙</button>
                    <button title="Remove step" onClick={() => removeStep(step)} style={iconBtn}>🗑</button>
                </div>
            ))}

            {steps.length > 0 && (
                <Button size="small" appearance="secondary" onClick={clearAll}>
                    Clear all build steps
                </Button>
            )}
        </div>
    );
}

const iconBtn = {
    all: 'unset',
    cursor: 'pointer',
    fontSize: 13,
    padding: '2px 5px',
    borderRadius: 4,
    lineHeight: 1.2,
};
