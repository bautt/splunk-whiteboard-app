import React, { useCallback, useEffect, useRef, useState } from 'react';
import BoardListPage from './BoardListPage';
import CanvasPage from './CanvasPage';
import { useBoards, useBoardMutations } from '../hooks/useKVStore';
import { BOARD_VISIBILITY } from '../lib/boardScope';
import { getBoardIdFromUrl, setBoardIdInUrl, pushBoardIdInUrl } from '../lib/url';

export default function App({ initialColorScheme }) {
    const [boardId, setBoardId] = useState(() => getBoardIdFromUrl());
    const { boards, loading } = useBoards();
    const { createBoard } = useBoardMutations();
    // Guards the one-time first-run auto-create so it can't loop.
    const bootRef = useRef(false);
    const [booting, setBooting] = useState(false);

    const openBoard = useCallback((id) => {
        // Push a history entry so the browser Back button returns to the board
        // list instead of exiting the whiteboard view (e.g. to the About tab).
        pushBoardIdInUrl(id);
        setBoardId(id);
    }, []);

    const closeBoard = useCallback(() => {
        // Replace the current (board) entry with the list URL. Combined with
        // push-on-open, the browser Back button still returns to the list and
        // never strands the user outside the whiteboard view.
        setBoardIdInUrl(null);
        setBoardId(null);
    }, []);

    useEffect(() => {
        const onPop = () => setBoardId(getBoardIdFromUrl());
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    // First-run experience: when there are no saved boards and no board in the
    // URL, drop the user straight onto a fresh empty whiteboard rather than an
    // empty list. Once any board exists, the list is the entry point.
    useEffect(() => {
        if (boardId || loading || bootRef.current) return;
        if (boards.length > 0) return;
        bootRef.current = true;
        setBooting(true);
        (async () => {
            try {
                const created = await createBoard('Untitled', '', BOARD_VISIBILITY.PRIVATE);
                if (created?.id) {
                    // Replace (not push) so Back doesn't return to an empty list
                    // that would immediately auto-create another board.
                    setBoardIdInUrl(created.id);
                    setBoardId(created.id);
                }
            } finally {
                setBooting(false);
            }
        })();
    }, [boardId, loading, boards.length, createBoard]);

    if (boardId) {
        return (
            <CanvasPage
                boardId={boardId}
                onClose={closeBoard}
                initialColorScheme={initialColorScheme}
            />
        );
    }

    if (loading || booting) {
        return <div style={{ padding: 24 }}>Loading…</div>;
    }

    return <BoardListPage onOpen={openBoard} />;
}
