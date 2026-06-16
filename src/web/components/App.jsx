import React, { useCallback, useEffect, useState } from 'react';
import BoardListPage from './BoardListPage';
import CanvasPage from './CanvasPage';
import { getBoardIdFromUrl, setBoardIdInUrl } from '../lib/url';

export default function App({ initialColorScheme }) {
    const [boardId, setBoardId] = useState(() => getBoardIdFromUrl());

    const openBoard = useCallback((id) => {
        setBoardIdInUrl(id);
        setBoardId(id);
    }, []);

    const closeBoard = useCallback(() => {
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
