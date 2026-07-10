// URL helpers for shareable board links.

export function getBoardIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

export function setBoardIdInUrl(boardId) {
    const url = new URL(window.location.href);
    if (boardId) {
        url.searchParams.set('id', boardId);
    } else {
        url.searchParams.delete('id');
    }
    window.history.replaceState({}, '', url.toString());
}

/**
 * Open a board by PUSHING a new history entry so the browser Back button
 * returns to the board list (rather than leaving the whiteboard view).
 */
export function pushBoardIdInUrl(boardId) {
    const url = new URL(window.location.href);
    if (boardId) {
        url.searchParams.set('id', boardId);
    } else {
        url.searchParams.delete('id');
    }
    window.history.pushState({}, '', url.toString());
}

export function buildShareLink(boardId) {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('id', boardId);
    return url.toString();
}
