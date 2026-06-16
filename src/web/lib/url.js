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

export function buildShareLink(boardId) {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('id', boardId);
    return url.toString();
}
