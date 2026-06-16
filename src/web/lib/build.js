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

/**
 * Expand a set of selected element ids to include every element that shares a
 * groupId with any selected element, so whole groups are tagged together.
 */
export function expandToGroups(elements, selectedIds) {
    const sel = new Set(
        Object.keys(selectedIds || {}).filter((k) => selectedIds[k])
    );
    if (sel.size === 0) return sel;
    const groupIds = new Set();
    elements.forEach((el) => {
        if (sel.has(el.id)) (el.groupIds || []).forEach((g) => groupIds.add(g));
    });
    if (groupIds.size) {
        elements.forEach((el) => {
            if ((el.groupIds || []).some((g) => groupIds.has(g))) sel.add(el.id);
        });
    }
    return sel;
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
    // Bucket by top-level group id (first groupId) or own id when ungrouped.
    const buckets = new Map();
    elements.forEach((el, i) => {
        const key = (el.groupIds && el.groupIds[0]) || `solo:${el.id}`;
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
