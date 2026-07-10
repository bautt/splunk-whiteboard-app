import { useCallback, useEffect, useRef, useState } from 'react';
import { kv, COLLECTIONS } from '../lib/kvstoreClient';
import { debug, logWarn } from '../lib/log';
import { getCurrentUser } from '../lib/currentUser';
import {
    BOARD_SCOPE,
    BOARD_VISIBILITY,
    scopeForVisibility,
    canShareBoard,
} from '../lib/boardScope';
import {
    fetchBoard,
    listAccessibleBoards,
    serializeBoardPayload,
} from '../lib/boardAccess';
import { deleteAllBoardHistory, migrateBoardHistory, revisionBeforeBoardWrite } from '../lib/historyStore';

export function useBoards() {
    const [boards, setBoards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const list = await listAccessibleBoards();
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

    const load = useCallback(async () => {
        if (!boardId) {
            setBoard(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const row = await fetchBoard(boardId);
            setBoard(row);
            setError(null);
        } catch (e) {
            setBoard(null);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [boardId]);

    useEffect(() => {
        load();
    }, [load]);

    return { board, loading, error, setBoard, refresh: load };
}

export function useBoardMutations() {
    const createBoard = useCallback(async (
        name = 'New Board',
        tags = '',
        visibility = BOARD_VISIBILITY.PRIVATE
    ) => {
        const scopeKey = scopeForVisibility(visibility);
        const doc = {
            name,
            tags,
            owner: getCurrentUser(),
            visibility,
            updated_at: Date.now(),
            elements_json: serializeBoardPayload({ elements: [], appState: {}, files: [] }),
        };
        const result = await kv.insert(COLLECTIONS.boards, doc, scopeKey);
        return {
            id: result?._key,
            scope: scopeKey,
            visibility,
        };
    }, []);

    const updateBoard = useCallback(async (id, patch, scopeKey = BOARD_SCOPE.SHARED) => {
        const existing = await kv.get(COLLECTIONS.boards, id, scopeKey);
        if (!existing) throw new Error(`Board ${id} not found`);

        const hasCanvasPatch =
            patch.elements !== undefined || patch.appState !== undefined || patch.files !== undefined;
        let parsed = { elements: [], appState: {}, files: [] };
        if (hasCanvasPatch) {
            try {
                parsed = JSON.parse(existing.elements_json || '{}');
            } catch {
                // keep defaults
            }
            await revisionBeforeBoardWrite(id, parsed, patch.saveSource, scopeKey);
        }
        const next = {
            name: patch.name ?? existing.name,
            tags: patch.tags ?? existing.tags,
            owner: existing.owner,
            visibility: existing.visibility || (scopeKey === BOARD_SCOPE.PRIVATE
                ? BOARD_VISIBILITY.PRIVATE
                : BOARD_VISIBILITY.SHARED),
            updated_at: Date.now(),
            elements_json: hasCanvasPatch
                ? serializeBoardPayload({
                    elements: patch.elements ?? parsed.elements,
                    appState: patch.appState ?? parsed.appState,
                    files: patch.files ?? parsed.files,
                })
                : existing.elements_json,
        };
        await kv.update(COLLECTIONS.boards, id, next, scopeKey);
    }, []);

    const deleteBoard = useCallback(async (id, scopeKey = BOARD_SCOPE.SHARED) => {
        await deleteAllBoardHistory(id, scopeKey);
        await kv.remove(COLLECTIONS.boards, id, scopeKey);
    }, []);

    const shareBoard = useCallback(async (board) => {
        if (!board?.id) throw new Error('Board not found');
        if (!canShareBoard(board)) {
            throw new Error('Only the owner can share a private board');
        }

        const existing = await kv.get(COLLECTIONS.boards, board.id, BOARD_SCOPE.PRIVATE);
        if (!existing) throw new Error('Private board not found');

        const sharedDoc = {
            name: existing.name,
            tags: existing.tags || '',
            owner: existing.owner || getCurrentUser(),
            visibility: BOARD_VISIBILITY.SHARED,
            updated_at: Date.now(),
            elements_json: existing.elements_json,
        };

        await kv.update(COLLECTIONS.boards, board.id, sharedDoc, BOARD_SCOPE.SHARED);
        await migrateBoardHistory(board.id, BOARD_SCOPE.PRIVATE, BOARD_SCOPE.SHARED);
        await kv.remove(COLLECTIONS.boards, board.id, BOARD_SCOPE.PRIVATE);

        return {
            id: board.id,
            scope: BOARD_SCOPE.SHARED,
            visibility: BOARD_VISIBILITY.SHARED,
        };
    }, []);

    return { createBoard, updateBoard, deleteBoard, shareBoard };
}

export function useAutoSave(boardId, scopeKey, getElementsAndState, options = {}) {
    const { intervalMs = 30_000, isCanvasReady = () => true } = options;
    const timerRef = useRef(null);
    const dirtyRef = useRef(false);
    const { updateBoard } = useBoardMutations();

    const markDirty = useCallback(() => {
        dirtyRef.current = true;
    }, []);

    useEffect(() => {
        if (!boardId || !scopeKey) return undefined;
        timerRef.current = setInterval(async () => {
            if (!dirtyRef.current) return;
            try {
                const { elements, appState, files } = getElementsAndState();
                const ready = isCanvasReady();
                if (!ready || elements == null) {
                    debug('autosave skipped (canvas not ready)');
                    return;
                }
                debug(`autosave firing with ${elements.length} elements`);
                await updateBoard(boardId, {
                    elements,
                    appState,
                    files,
                    saveSource: 'autosave',
                }, scopeKey);
                dirtyRef.current = false;
            } catch (e) {
                logWarn('Autosave failed', e);
            }
        }, intervalMs);
        return () => clearInterval(timerRef.current);
    }, [boardId, scopeKey, getElementsAndState, intervalMs, isCanvasReady, updateBoard]);

    return { markDirty };
}
