import { getCurrentUser } from './currentUser';

/** KV namespace scope for board documents and per-board history. */
export const BOARD_SCOPE = {
    SHARED: 'shared',
    PRIVATE: 'private',
};

export const BOARD_VISIBILITY = {
    PRIVATE: 'private',
    SHARED: 'shared',
};

export function resolveKvScope(scopeKey = BOARD_SCOPE.SHARED) {
    if (scopeKey === BOARD_SCOPE.PRIVATE) {
        return {
            key: BOARD_SCOPE.PRIVATE,
            owner: getCurrentUser(),
            sharing: 'user',
        };
    }
    return {
        key: BOARD_SCOPE.SHARED,
        owner: 'nobody',
        sharing: 'app',
    };
}

export function visibilityForScope(scopeKey, rowVisibility) {
    if (rowVisibility === BOARD_VISIBILITY.SHARED || rowVisibility === BOARD_VISIBILITY.PRIVATE) {
        return rowVisibility;
    }
    return scopeKey === BOARD_SCOPE.PRIVATE
        ? BOARD_VISIBILITY.PRIVATE
        : BOARD_VISIBILITY.SHARED;
}

export function scopeForVisibility(visibility) {
    return visibility === BOARD_VISIBILITY.SHARED ? BOARD_SCOPE.SHARED : BOARD_SCOPE.PRIVATE;
}

export function canShareBoard(board) {
    if (!board) return false;
    return board.scope === BOARD_SCOPE.PRIVATE
        && board.visibility === BOARD_VISIBILITY.PRIVATE
        && board.owner === getCurrentUser();
}

export function visibilityLabel(visibility) {
    return visibility === BOARD_VISIBILITY.SHARED ? 'Shared' : 'Private';
}

/** Thrown when a board write would clobber a newer version saved elsewhere. */
export class BoardConflictError extends Error {
    constructor(message = 'Board was changed elsewhere') {
        super(message);
        this.name = 'BoardConflictError';
        this.code = 'conflict';
    }
}

export function isConflictError(err) {
    return err?.code === 'conflict' || err?.name === 'BoardConflictError';
}
