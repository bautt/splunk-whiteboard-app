// Progressive "build" reveal — PowerPoint-style step-by-step appearance.
//
// Each element may carry customData.build = { step: N } where N >= 1.
// Untagged elements (or step 0) form the always-visible base layer.
// During presentation, advancing the build reveals elements whose step <= current.
//
// All scene mutations bump a monotonically increasing version so Excalidraw's
// reconciler always picks up the latest state — including the final restore.

export const BASE_STEP = 0;

let REV = 0;
function bumpVersion(el) {
    REV += 1;
    return {
        ...el,
        version: (el.version || 1) + REV,
        versionNonce: Math.floor(Math.random() * 1e9),
    };
}

/** The build step an element belongs to (0 = always-visible base layer). */
export function getStep(el) {
    const s = el?.customData?.build?.step;
    return typeof s === 'number' && s > 0 ? s : BASE_STEP;
}

/** Highest build step present in the scene (0 if none defined). */
export function getMaxStep(elements) {
    return (elements || []).reduce((m, el) => Math.max(m, getStep(el)), 0);
}

/** True if any element carries a build step (i.e. build mode is configured). */
export function hasBuild(elements) {
    return getMaxStep(elements) > 0;
}

const CONTAINER_TYPES = new Set(['rectangle', 'ellipse', 'diamond']);

/**
 * Expand a set of selected element ids to include linked elements so build
 * steps treat a shape and its label as one unit:
 *   - shared groupIds (app stencils)
 *   - containerId / boundElements (Excalidraw text-in-shape)
 */
export function expandToGroups(elements, selectedIds) {
    const sel = new Set(
        Object.keys(selectedIds || {}).filter((k) => selectedIds[k])
    );
    if (sel.size === 0) return sel;

    const live = (elements || []).filter((el) => el && !el.isDeleted);
    const byId = new Map(live.map((el) => [el.id, el]));

    let changed = true;
    while (changed) {
        changed = false;
        const toAdd = [];

        for (const id of sel) {
            const el = byId.get(id);
            if (!el) continue;

            for (const gid of el.groupIds || []) {
                live.forEach((other) => {
                    if ((other.groupIds || []).includes(gid)) toAdd.push(other.id);
                });
            }

            if (el.containerId) toAdd.push(el.containerId);

            for (const bound of el.boundElements || []) {
                if (bound?.id) toAdd.push(bound.id);
            }

            if (CONTAINER_TYPES.has(el.type)) {
                live.forEach((other) => {
                    if (other.type === 'text' && other.containerId === el.id) {
                        toAdd.push(other.id);
                    }
                });
            }
        }

        for (const id of toAdd) {
            if (!sel.has(id)) {
                sel.add(id);
                changed = true;
            }
        }
    }

    return sel;
}

/** Bucket key for auto-numbering: one step per visual unit (group, box+label, or solo). */
function autoNumberBucketKey(el, byId) {
    if (el.groupIds?.[0]) return `grp:${el.groupIds[0]}`;
    if (el.containerId) return `ctr:${el.containerId}`;
    if (CONTAINER_TYPES.has(el.type)) {
        const hasLabel = (el.boundElements || []).some((b) => b.type === 'text');
        const hasBoundText = [...byId.values()].some(
            (other) => other.type === 'text' && other.containerId === el.id
        );
        if (hasLabel || hasBoundText) return `box:${el.id}`;
    }
    return `solo:${el.id}`;
}

/** Return a new element array with build.step set on the given ids. */
export function tagStep(elements, ids, step) {
    const idSet = ids instanceof Set ? ids : new Set(ids);
    return elements.map((el) =>
        idSet.has(el.id)
            ? {
                  ...el,
                  customData: { ...(el.customData || {}), build: { step } },
                  version: (el.version || 1) + 1,
              }
            : el
    );
}

/** Remove build tags from the given ids (or all if ids omitted). */
export function clearStep(elements, ids) {
    const idSet = ids ? (ids instanceof Set ? ids : new Set(ids)) : null;
    return elements.map((el) => {
        if (idSet && !idSet.has(el.id)) return el;
        if (!el.customData || !el.customData.build) return el;
        const { build, ...restData } = el.customData;
        return {
            ...el,
            customData: restData,
            version: (el.version || 1) + 1,
        };
    });
}

/**
 * Auto-assign one build step per top-level group, ordered by the chosen axis.
 * Ungrouped elements each become their own step. Returns a new element array.
 *   axis: 'z' (paint order) | 'x' (left→right) | 'y' (top→bottom) |
 *         'y-rev' (bottom→top) | 'x-rev' (right→left)
 */
export function autoNumberByGroup(elements, axis = 'z') {
    const live = (elements || []).filter((el) => el && !el.isDeleted);
    const byId = new Map(live.map((el) => [el.id, el]));
    const buckets = new Map();
    live.forEach((el, i) => {
        const key = autoNumberBucketKey(el, byId);
        if (!buckets.has(key)) {
            buckets.set(key, {
                key, ids: [], minX: Infinity, minY: Infinity,
                maxY: -Infinity, maxX: -Infinity, order: i,
            });
        }
        const b = buckets.get(key);
        b.ids.push(el.id);
        if (el.x != null) {
            b.minX = Math.min(b.minX, el.x);
            b.maxX = Math.max(b.maxX, el.x + (el.width || 0));
        }
        if (el.y != null) {
            b.minY = Math.min(b.minY, el.y);
            b.maxY = Math.max(b.maxY, el.y + (el.height || 0));
        }
    });

    const list = [...buckets.values()];
    list.sort((a, b) => {
        if (axis === 'x') return a.minX - b.minX;
        if (axis === 'x-rev') return b.maxX - a.maxX;
        if (axis === 'y') return a.minY - b.minY;
        if (axis === 'y-rev') return b.maxY - a.maxY;
        return a.order - b.order;
    });

    const stepById = new Map();
    list.forEach((b, idx) => b.ids.forEach((id) => stepById.set(id, idx + 1)));

    return elements.map((el) => {
        const step = stepById.get(el.id);
        return step
            ? {
                  ...el,
                  customData: { ...(el.customData || {}), build: { step } },
                  version: (el.version || 1) + 1,
              }
            : el;
    });
}

/** Swap two build steps (used for reorder up/down). Returns new element array. */
export function swapSteps(elements, a, b) {
    return elements.map((el) => {
        const s = getStep(el);
        if (s !== a && s !== b) return el;
        const step = s === a ? b : a;
        return {
            ...el,
            customData: { ...(el.customData || {}), build: { step } },
            version: (el.version || 1) + 1,
        };
    });
}

/**
 * Move one build step to a new position in the reveal order.
 * @param {object[]} elements
 * @param {number} draggedStep - step number being moved
 * @param {number|null} insertBeforeStep - step to insert before, or null to append
 */
export function reorderSteps(elements, draggedStep, insertBeforeStep) {
    const ordered = summarizeSteps(elements).map(({ step }) => step);
    const fromIdx = ordered.indexOf(draggedStep);
    if (fromIdx < 0) return elements;

    let toIdx;
    if (insertBeforeStep == null) {
        toIdx = ordered.length;
    } else {
        toIdx = ordered.indexOf(insertBeforeStep);
        if (toIdx < 0) return elements;
    }
    if (fromIdx < toIdx) toIdx -= 1;
    if (fromIdx === toIdx) return elements;

    const nextOrder = [...ordered];
    const [removed] = nextOrder.splice(fromIdx, 1);
    nextOrder.splice(toIdx, 0, removed);

    const stepMap = new Map(nextOrder.map((oldStep, i) => [oldStep, i + 1]));

    return elements.map((el) => {
        const s = getStep(el);
        if (s <= 0) return el;
        const newStep = stepMap.get(s);
        if (!newStep || newStep === s) return el;
        return {
            ...el,
            customData: { ...(el.customData || {}), build: { step: newStep } },
            version: (el.version || 1) + 1,
        };
    });
}

/**
 * Compute the element array to show at a given build step.
 *  - step <= current  → visible at base opacity (original locked state restored)
 *  - step  > current  → hidden (opacity 0, locked so it can't be clicked)
 *  - opts.fadingStep   → elements of exactly that step rendered at fadeFactor*base
 */
export function computeReveal(snapshot, current, opts = {}) {
    const { fadingStep = null, fadeFactor = 1 } = opts;
    return snapshot.map((el) => {
        const s = getStep(el);
        const baseOpacity = typeof el.opacity === 'number' ? el.opacity : 100;
        let out;
        if (s <= current) {
            const op =
                fadingStep != null && s === fadingStep && s > 0
                    ? Math.max(0, Math.min(baseOpacity, baseOpacity * fadeFactor))
                    : baseOpacity;
            out = { ...el, opacity: op, locked: !!el.locked };
        } else {
            out = { ...el, opacity: 0, locked: true };
        }
        return bumpVersion(out);
    });
}

/** Restore the original scene (used on presentation exit). */
export function restoreSnapshot(snapshot) {
    return snapshot.map((el) => bumpVersion({ ...el }));
}

/**
 * Strip transient reveal/preview mutations before persisting or after loading.
 * computeReveal hides future steps with opacity 0 + locked; if that state is
 * saved, elements re-open invisible on the canvas.
 */
export function sanitizeElementsForPersistence(elements) {
    return (elements || []).map((el) => {
        if (!el || el.isDeleted) return el;
        if (el.opacity === 0 && el.locked) {
            return {
                ...el,
                opacity: 100,
                locked: false,
                version: (el.version || 1) + 1,
            };
        }
        return el;
    });
}

/** Group elements by build step for the authoring UI. Returns [{step, count}]. */
export function summarizeSteps(elements) {
    const counts = new Map();
    (elements || []).forEach((el) => {
        const s = getStep(el);
        if (s > 0) counts.set(s, (counts.get(s) || 0) + 1);
    });
    return [...counts.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([step, count]) => ({ step, count }));
}

const LIVE = (elements) => (elements || []).filter((el) => !el.isDeleted);

/** Short label for an element in the Build panel step list. */
export function elementLabel(el) {
    if (!el || el.isDeleted) return null;
    if (el.type === 'text' && el.text) {
        const line = el.text.split('\n')[0].trim();
        if (line) return line.length > 42 ? `${line.slice(0, 39)}…` : line;
    }
    if (el.type === 'frame' && el.name) return el.name;
    const typeNames = {
        rectangle: 'Rectangle',
        diamond: 'Diamond',
        ellipse: 'Ellipse',
        arrow: 'Arrow',
        line: 'Line',
        image: 'Image',
        freedraw: 'Drawing',
        text: 'Text',
    };
    return typeNames[el.type] || el.type;
}

/** Members of a build step with display labels (deduped, capped). */
export function describeStep(elements, step) {
    const members = LIVE(elements).filter((el) => getStep(el) === step);
    const seen = new Set();
    const labels = [];
    for (const el of members) {
        const label = elementLabel(el);
        if (!label || seen.has(label)) continue;
        seen.add(label);
        labels.push(label);
    }
    return {
        count: members.length,
        labels: labels.slice(0, 4),
        more: Math.max(0, labels.length - 4),
        ids: members.map((el) => el.id),
    };
}

/** Elements on the always-visible base layer (no build step). */
export function getUntaggedMembers(elements) {
    return LIVE(elements).filter((el) => getStep(el) === BASE_STEP);
}

export function getUntaggedIds(elements) {
    return getUntaggedMembers(elements).map((el) => el.id);
}

export function getStepMemberIds(elements, step) {
    return LIVE(elements).filter((el) => getStep(el) === step).map((el) => el.id);
}

/** True when canvas selection matches the members of a step (including linked labels). */
export function selectionMatchesStep(elements, selectedIds, step) {
    const memberIds = getStepMemberIds(elements, step);
    const expandedMembers = expandToGroups(elements, idsToSelection(memberIds));
    const expandedSel = expandToGroups(elements, selectedIds);
    if (expandedMembers.size === 0) return false;
    if (expandedMembers.size !== expandedSel.size) return false;
    for (const id of expandedMembers) {
        if (!expandedSel.has(id)) return false;
    }
    return true;
}

export function idsToSelection(ids) {
    return Object.fromEntries(ids.map((id) => [id, true]));
}
