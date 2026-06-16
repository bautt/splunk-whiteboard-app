import { useCallback, useEffect, useRef, useState } from 'react';
import { kv, COLLECTIONS } from '../lib/kvstoreClient';
import { debug, logWarn } from '../lib/log';

function getCurrentUser() {
    try {
        return window.$C?.USERNAME || 'unknown';
    } catch {
        return 'unknown';
    }
}

function deserialize(row) {
    let elements = [];
    let appState = {};
    try {
        const parsed = JSON.parse(row.elements_json || '{}');
        elements = parsed.elements || [];
        appState = parsed.appState || {};
    } catch {
        // tolerate corrupt rows
    }
    return {
        id: row._key,
        name: row.name || 'Untitled',
        tags: row.tags || '',
        owner: row.owner || '',
        updatedAt: Number(row.updated_at) || 0,
        elements,
        appState,
    };
}

function serialize({ elements, appState }) {
    return JSON.stringify({ elements: elements || [], appState: appState || {} });
}

export function useBoards() {
    const [boards, setBoards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const rows = await kv.list(COLLECTIONS.boards);
            const list = (rows || []).map(deserialize);
            list.sort((a, b) => b.updatedAt - a.updatedAt);
            setBoards(list);
            setError(null);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { boards, loading, error, refresh };
}

export function useBoard(boardId) {
    const [board, setBoard] = useState(null);
    const [loading, setLoading] = useState(Boolean(boardId));
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!boardId) {
            setBoard(null);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        kv.get(COLLECTIONS.boards, boardId)
            .then((row) => {
                if (cancelled) return;
                setBoard(row ? deserialize(row) : null);
                setError(null);
            })
            .catch((e) => !cancelled && setError(e.message))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [boardId]);

    return { board, loading, error, setBoard };
}

export function useBoardMutations() {
    const createBoard = useCallback(async (name = 'New Board', tags = '') => {
        const doc = {
            name,
            tags,
            owner: getCurrentUser(),
            updated_at: Date.now(),
            elements_json: serialize({ elements: [], appState: {} }),
        };
        const result = await kv.insert(COLLECTIONS.boards, doc);
        return result?._key;
    }, []);

    const updateBoard = useCallback(async (id, patch) => {
        const existing = await kv.get(COLLECTIONS.boards, id);
        if (!existing) throw new Error(`Board ${id} not found`);
        const elementsArg = patch.elements;
        const appStateArg = patch.appState;
        const next = {
            name: patch.name ?? existing.name,
            tags: patch.tags ?? existing.tags,
            owner: existing.owner,
            updated_at: Date.now(),
            elements_json:
                elementsArg !== undefined || appStateArg !== undefined
                    ? serialize({ elements: elementsArg, appState: appStateArg })
                    : existing.elements_json,
        };
        debug(
            `updateBoard(${id}) -> ${
                Array.isArray(elementsArg) ? elementsArg.length : '(unchanged)'
            } elements, elements_json=${next.elements_json.length} bytes`
        );
        await kv.update(COLLECTIONS.boards, id, next);
    }, []);

    const deleteBoard = useCallback(async (id) => {
        await kv.remove(COLLECTIONS.boards, id);
    }, []);

    return { createBoard, updateBoard, deleteBoard };
}

export function useAutoSave(boardId, getElementsAndState, intervalMs = 30_000) {
    const timerRef = useRef(null);
    const dirtyRef = useRef(false);
    const { updateBoard } = useBoardMutations();

    const markDirty = useCallback(() => {
        dirtyRef.current = true;
    }, []);

    useEffect(() => {
        if (!boardId) return undefined;
        timerRef.current = setInterval(async () => {
            if (!dirtyRef.current) return;
            try {
                const { elements, appState } = getElementsAndState();
                // Defensive: if the API returned no elements (e.g. mid-mount / stale ref),
                // skip this autosave tick rather than overwriting a real saved board with [].
                if (!elements || elements.length === 0) {
                    debug('autosave skipped (0 elements)');
                    return;
                }
                debug(`autosave firing with ${elements.length} elements`);
                await updateBoard(boardId, { elements, appState });
                dirtyRef.current = false;
            } catch (e) {
                // surface autosave failures; UI will show stale state until next manual save
                logWarn('Autosave failed', e);
            }
        }, intervalMs);
        return () => clearInterval(timerRef.current);
    }, [boardId, getElementsAndState, intervalMs, updateBoard]);

    return { markDirty };
}
