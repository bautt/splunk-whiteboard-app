import { useCallback, useEffect, useRef, useState } from 'react';
import { kv, COLLECTIONS } from '../lib/kvstoreClient';
import { debug, logWarn } from '../lib/log';
import { getCurrentUser } from '../lib/currentUser';
import {
    BOARD_SCOPE,
    BOARD_VISIBILITY,
    scopeForVisibility,
    canShareBoard,
    BoardConflictError,
    isConflictError,
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

    const importBoard = useCallback(async ({
        name = 'Imported board',
        tags = '',
        elements = [],
        appState = {},
        files = [],
        visibility = BOARD_VISIBILITY.PRIVATE,
    }) => {
        const scopeKey = scopeForVisibility(visibility);
        const doc = {
            name,
            tags,
            owner: getCurrentUser(),
            visibility,
            updated_at: Date.now(),
            elements_json: serializeBoardPayload({ elements, appState, files }),
        };
        const result = await kv.insert(COLLECTIONS.boards, doc, scopeKey);
        return { id: result?._key, scope: scopeKey, visibility };
    }, []);

    const updateBoard = useCallback(async (id, patch, scopeKey = BOARD_SCOPE.SHARED, options = {}) => {
        const existing = await kv.get(COLLECTIONS.boards, id, scopeKey);
        if (!existing) throw new Error(`Board ${id} not found`);

        // Optimistic-concurrency guard: refuse to overwrite a version newer than
        // the one the caller last synced (another user/tab saved in between).
        const { expectedUpdatedAt } = options;
        if (expectedUpdatedAt != null) {
            const currentUpdatedAt = Number(existing.updated_at) || 0;
            if (currentUpdatedAt > Number(expectedUpdatedAt)) {
                throw new BoardConflictError(
                    'This board was changed elsewhere since you opened it.'
                );
            }
        }

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
        const updatedAt = Date.now();
        const next = {
            name: patch.name ?? existing.name,
            tags: patch.tags ?? existing.tags,
            owner: existing.owner,
            visibility: existing.visibility || (scopeKey === BOARD_SCOPE.PRIVATE
                ? BOARD_VISIBILITY.PRIVATE
                : BOARD_VISIBILITY.SHARED),
            updated_at: updatedAt,
            elements_json: hasCanvasPatch
                ? serializeBoardPayload({
                    elements: patch.elements ?? parsed.elements,
                    appState: patch.appState ?? parsed.appState,
                    files: patch.files ?? parsed.files,
                })
                : existing.elements_json,
        };
        await kv.update(COLLECTIONS.boards, id, next, scopeKey);
        return { updatedAt };
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

        // 1. Write the shared copy FIRST so data is never lost, even if a later
        //    step fails. upsert preserves the board's _key (stable share links).
        await kv.upsert(COLLECTIONS.boards, board.id, sharedDoc, BOARD_SCOPE.SHARED);

        // 2. Best-effort history migration — a failure here must not lose the
        //    board itself; the shared copy already exists.
        let warning = null;
        try {
            await migrateBoardHistory(board.id, BOARD_SCOPE.PRIVATE, BOARD_SCOPE.SHARED);
        } catch (e) {
            logWarn('Board history migration failed during share', e);
            warning = 'Board shared, but its revision history could not be migrated.';
        }

        // 3. Remove the private copy. If this fails the board is still shared;
        //    surface a warning rather than reporting a hard failure.
        try {
            await kv.remove(COLLECTIONS.boards, board.id, BOARD_SCOPE.PRIVATE);
        } catch (e) {
            logWarn('Removing private board copy failed during share', e);
            warning = 'Board shared, but a private copy could not be removed. '
                + 'Delete it from the board list if it still appears.';
        }

        return {
            id: board.id,
            scope: BOARD_SCOPE.SHARED,
            visibility: BOARD_VISIBILITY.SHARED,
            warning,
        };
    }, []);

    return { createBoard, importBoard, updateBoard, deleteBoard, shareBoard };
}

export function useAutoSave(boardId, scopeKey, getElementsAndState, options = {}) {
    const {
        intervalMs = 30_000,
        isCanvasReady = () => true,
        getExpectedUpdatedAt = () => null,
        onSaved = () => {},
        onConflict = () => {},
    } = options;
    const timerRef = useRef(null);
    const dirtyRef = useRef(false);
    // Once a conflict is detected we stop auto-overwriting to avoid clobbering
    // another user's changes; the user must reload the board to resume.
    const pausedRef = useRef(false);
    const { updateBoard } = useBoardMutations();

    const markDirty = useCallback(() => {
        dirtyRef.current = true;
    }, []);

    // Resume auto-save after a conflict was resolved (e.g. user force-saved).
    const resume = useCallback(() => {
        pausedRef.current = false;
    }, []);

    useEffect(() => {
        // Reset the conflict pause whenever the board (re)loads.
        pausedRef.current = false;
    }, [boardId, scopeKey]);

    useEffect(() => {
        if (!boardId || !scopeKey) return undefined;
        timerRef.current = setInterval(async () => {
            if (!dirtyRef.current || pausedRef.current) return;
            try {
                const { elements, appState, files } = getElementsAndState();
                const ready = isCanvasReady();
                if (!ready || elements == null) {
                    debug('autosave skipped (canvas not ready)');
                    return;
                }
                debug(`autosave firing with ${elements.length} elements`);
                const result = await updateBoard(boardId, {
                    elements,
                    appState,
                    files,
                    saveSource: 'autosave',
                }, scopeKey, { expectedUpdatedAt: getExpectedUpdatedAt() });
                dirtyRef.current = false;
                if (result?.updatedAt) onSaved(result.updatedAt);
            } catch (e) {
                if (isConflictError(e)) {
                    pausedRef.current = true;
                    onConflict(e);
                    return;
                }
                logWarn('Autosave failed', e);
            }
        }, intervalMs);
        return () => clearInterval(timerRef.current);
    }, [
        boardId,
        scopeKey,
        getElementsAndState,
        intervalMs,
        isCanvasReady,
        updateBoard,
        getExpectedUpdatedAt,
        onSaved,
        onConflict,
    ]);

    return { markDirty, resume };
}
