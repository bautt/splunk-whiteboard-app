import React, { useCallback, useEffect, useRef, useState } from 'react';
import Button from '@splunk/react-ui/Button';
import Heading from '@splunk/react-ui/Heading';
import Message from '@splunk/react-ui/Message';
import P from '@splunk/react-ui/Paragraph';
import Switch from '@splunk/react-ui/Switch';
import {
    getMaxStep,
    expandToGroups,
    tagStep,
    clearStep,
    autoNumberByGroup,
    swapSteps,
    summarizeSteps,
    getStep,
    computeReveal,
    restoreSnapshot,
    describeStep,
    getUntaggedMembers,
    getUntaggedIds,
    getStepMemberIds,
    selectionMatchesStep,
    idsToSelection,
} from '../lib/build';

// Authoring UI for PowerPoint-style "build" reveal. Lets the presenter assign
// canvas elements/groups to ordered steps that appear one click at a time in
// presentation mode.
export default function BuildPanel({
    excalidrawAPI,
    markDirty,
    selectedIds,
    suppressSaveRef,
}) {
    const [, setTick] = useState(0);
    const refresh = useCallback(() => setTick((t) => t + 1), []);

    const [previewStep, setPreviewStep] = useState(null);
    const canonicalRef = useRef(null);
    const apiRef = useRef(excalidrawAPI);
    apiRef.current = excalidrawAPI;

    const elements = excalidrawAPI ? excalidrawAPI.getSceneElements() : [];
    const canonical = canonicalRef.current || elements;
    const steps = summarizeSteps(canonical);
    const maxStep = getMaxStep(canonical);
    const untagged = getUntaggedMembers(canonical);

    const selectedCount = Object.values(selectedIds || {}).filter(Boolean).length;

    const activeStep = steps.find(({ step }) =>
        selectionMatchesStep(canonical, selectedIds, step)
    )?.step;

    const applyPreview = useCallback(
        (step, snapshot) => {
            const api = apiRef.current;
            if (!api || !snapshot) return;
            if (step == null) {
                api.updateScene({ elements: restoreSnapshot(snapshot) });
                if (suppressSaveRef) suppressSaveRef.current = false;
            } else {
                if (suppressSaveRef) suppressSaveRef.current = true;
                api.updateScene({ elements: computeReveal(snapshot, step) });
            }
        },
        [suppressSaveRef]
    );

    const exitPreview = useCallback(() => {
        const snap = canonicalRef.current;
        if (snap) {
            applyPreview(null, snap);
        }
        canonicalRef.current = null;
        setPreviewStep((prev) => (prev == null ? prev : null));
    }, [applyPreview]);

    const enterPreview = useCallback(
        (step) => {
            const api = apiRef.current;
            if (!api) return;
            if (!canonicalRef.current) {
                canonicalRef.current = api.getSceneElements();
            }
            setPreviewStep(step);
            applyPreview(step, canonicalRef.current);
        },
        [applyPreview]
    );

    // Restore the canvas when leaving the Build tab — unmount only (no deps).
    useEffect(() => {
        return () => {
            const snap = canonicalRef.current;
            const api = apiRef.current;
            if (snap && api) {
                api.updateScene({ elements: restoreSnapshot(snap) });
            }
            canonicalRef.current = null;
            if (suppressSaveRef) suppressSaveRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const commit = useCallback(
        (next) => {
            if (!excalidrawAPI) return;
            if (previewStep != null) {
                canonicalRef.current = next;
                applyPreview(previewStep, next);
            } else {
                excalidrawAPI.updateScene({ elements: next });
            }
            if (markDirty) markDirty();
            refresh();
        },
        [excalidrawAPI, markDirty, refresh, previewStep, applyPreview]
    );

    const selectIds = useCallback(
        (ids) => {
            if (!excalidrawAPI || ids.length === 0) return;
            const members = canonical.filter((el) => ids.includes(el.id));
            excalidrawAPI.updateScene({
                appState: { selectedElementIds: idsToSelection(ids) },
            });
            if (members.length) {
                excalidrawAPI.scrollToContent(members, { fitToContent: true });
            }
        },
        [excalidrawAPI, canonical]
    );

    const addSelectedAsStep = useCallback(() => {
        if (!excalidrawAPI) return;
        const els = canonicalRef.current || excalidrawAPI.getSceneElements();
        const sel = expandToGroups(els, selectedIds);
        if (sel.size === 0) return;
        commit(tagStep(els, sel, getMaxStep(els) + 1));
    }, [excalidrawAPI, commit, selectedIds]);

    const removeSelectionFromSteps = useCallback(() => {
        if (!excalidrawAPI) return;
        const els = canonicalRef.current || excalidrawAPI.getSceneElements();
        const sel = expandToGroups(els, selectedIds);
        if (sel.size === 0) return;
        commit(clearStep(els, [...sel]));
    }, [excalidrawAPI, commit, selectedIds]);

    const autoNumber = useCallback(
        (axis) => {
            if (!excalidrawAPI) return;
            const els = canonicalRef.current || excalidrawAPI.getSceneElements();
            commit(autoNumberByGroup(els, axis));
        },
        [excalidrawAPI, commit]
    );

    const clearAll = useCallback(() => {
        if (!excalidrawAPI) return;
        if (!window.confirm('Remove all build steps? Elements stay on the canvas.')) return;
        const els = canonicalRef.current || excalidrawAPI.getSceneElements();
        commit(clearStep(els));
    }, [excalidrawAPI, commit]);

    const selectStep = useCallback(
        (step) => {
            const ids = getStepMemberIds(canonical, step);
            selectIds(ids);
        },
        [canonical, selectIds]
    );

    const selectUntagged = useCallback(() => {
        selectIds(getUntaggedIds(canonical));
    }, [canonical, selectIds]);

    const removeStep = useCallback(
        (step) => {
            if (!excalidrawAPI) return;
            const els = canonicalRef.current || excalidrawAPI.getSceneElements();
            const ids = els.filter((el) => getStep(el) === step).map((el) => el.id);
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
            const els = canonicalRef.current || excalidrawAPI.getSceneElements();
            commit(swapSteps(els, step, other));
        },
        [excalidrawAPI, commit, maxStep]
    );

    const togglePreview = useCallback(() => {
        if (previewStep != null) {
            exitPreview();
        } else {
            enterPreview(maxStep > 0 ? maxStep : 0);
        }
    }, [previewStep, exitPreview, enterPreview, maxStep]);

    return (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Heading level={3}>Build (reveal on click)</Heading>
            <P style={{ fontSize: 12, margin: 0, opacity: 0.75 }}>
                <strong>Base layer</strong> (no step) is always visible in Present.
                Tag elements as steps 1, 2, 3… to reveal them click-by-click.
            </P>

            {untagged.length > 0 && steps.length > 0 && (
                <Message type="warning">
                    <span style={{ fontSize: 12 }}>
                        {untagged.length} element{untagged.length !== 1 ? 's' : ''} not in any step
                        — always visible during Present.
                    </span>
                    <div style={{ marginTop: 6 }}>
                        <Button size="small" onClick={selectUntagged}>
                            Select untagged
                        </Button>
                    </div>
                </Message>
            )}

            <div
                style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--gray60, #c3cbd4)',
                    background: 'var(--gray95, #f2f4f5)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Switch
                        value="preview"
                        selected={previewStep != null}
                        onClick={togglePreview}
                        appearance="toggle"
                        disabled={!excalidrawAPI}
                    >
                        Preview reveal
                    </Switch>
                    {previewStep != null && (
                        <span style={{ fontSize: 11, opacity: 0.7 }}>
                            Showing through step {previewStep}
                        </span>
                    )}
                </div>
                {previewStep != null && maxStep > 0 && (
                    <div style={{ marginTop: 8 }}>
                        <input
                            type="range"
                            min={0}
                            max={maxStep}
                            value={previewStep}
                            onChange={(e) => enterPreview(Number(e.target.value))}
                            style={{ width: '100%' }}
                        />
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: 10,
                                opacity: 0.6,
                            }}
                        >
                            <span>Base only</span>
                            <span>Step {maxStep}</span>
                        </div>
                    </div>
                )}
            </div>

            <Button
                appearance="primary"
                disabled={!excalidrawAPI || selectedCount === 0}
                onClick={addSelectedAsStep}
            >
                {selectedCount > 0
                    ? `Add selection as step ${maxStep + 1} (${selectedCount})`
                    : 'Select elements to add a step'}
            </Button>

            {selectedCount > 0 && (
                <Button
                    size="small"
                    appearance="secondary"
                    disabled={!excalidrawAPI}
                    onClick={removeSelectionFromSteps}
                >
                    Remove selection from steps (→ base layer)
                </Button>
            )}

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

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    border: '1px dashed var(--gray60, #c3cbd4)',
                    borderRadius: 6,
                    padding: '6px 8px',
                    fontSize: 12,
                }}
            >
                <span
                    style={{
                        flexShrink: 0,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'var(--gray70, #a8b0b8)',
                        color: '#fff',
                        fontSize: 11,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    title="Always visible in Present"
                >
                    0
                </span>
                <span style={{ flex: 1 }}>
                    Base layer — {untagged.length} element{untagged.length !== 1 ? 's' : ''}
                </span>
                <button
                    type="button"
                    title="Select base layer on canvas"
                    onClick={selectUntagged}
                    style={iconBtn}
                    disabled={untagged.length === 0}
                >
                    Select
                </button>
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', opacity: 0.6 }}>
                {steps.length > 0 ? `${steps.length} reveal step${steps.length !== 1 ? 's' : ''}` : 'No reveal steps yet'}
            </div>

            {steps.map(({ step, count }) => {
                const detail = describeStep(canonical, step);
                const isActive = activeStep === step;
                return (
                    <div
                        key={step}
                        role="button"
                        tabIndex={0}
                        onClick={() => selectStep(step)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                selectStep(step);
                            }
                        }}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                            border: isActive
                                ? '2px solid #5a4fcf'
                                : '1px solid var(--gray60, #c3cbd4)',
                            borderRadius: 6,
                            padding: '6px 8px',
                            cursor: 'pointer',
                            background: isActive ? 'rgba(90, 79, 207, 0.08)' : 'transparent',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                            <span style={{ flex: 1, fontSize: 12, fontWeight: isActive ? 600 : 400 }}>
                                {count} element{count !== 1 ? 's' : ''}
                                {isActive ? ' · selected' : ''}
                            </span>
                            <button
                                type="button"
                                title="Move earlier"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    move(step, -1);
                                }}
                                style={iconBtn}
                            >
                                ↑
                            </button>
                            <button
                                type="button"
                                title="Move later"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    move(step, +1);
                                }}
                                style={iconBtn}
                            >
                                ↓
                            </button>
                            <button
                                type="button"
                                title="Remove step"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeStep(step);
                                }}
                                style={iconBtn}
                            >
                                🗑
                            </button>
                        </div>
                        {detail.labels.length > 0 && (
                            <ul
                                style={{
                                    margin: '0 0 0 28px',
                                    padding: 0,
                                    listStyle: 'disc',
                                    fontSize: 11,
                                    opacity: 0.85,
                                }}
                            >
                                {detail.labels.map((label, i) => (
                                    <li key={`${step}-${i}-${label}`}>{label}</li>
                                ))}
                                {detail.more > 0 && (
                                    <li style={{ listStyle: 'none', opacity: 0.6 }}>
                                        +{detail.more} more…
                                    </li>
                                )}
                            </ul>
                        )}
                    </div>
                );
            })}

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
