import React, { useCallback, useEffect, useState } from 'react';
import BoardListPage from './BoardListPage';
import CanvasPage from './CanvasPage';
import { getBoardIdFromUrl, setBoardIdInUrl, pushBoardIdInUrl } from '../lib/url';

export default function App({ initialColorScheme }) {
    const [boardId, setBoardId] = useState(() => getBoardIdFromUrl());

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

    if (boardId) {
        return (
            <CanvasPage
                boardId={boardId}
                onClose={closeBoard}
                initialColorScheme={initialColorScheme}
            />
        );
    }
    return <BoardListPage onOpen={openBoard} />;
}
