import React from 'react';
import { MainMenu } from '@excalidraw/excalidraw';

/** Matches Excalidraw 0.17.6 actionToggleGridMode (constants.GRID_SIZE). */
export const EXCALIDRAW_GRID_SIZE = 20;

/**
 * Canvas preference toggles in the Excalidraw hamburger menu (MainMenu).
 *
 * Grid + object snap mirror actionToggleGridMode / actionToggleObjectsSnapMode:
 * enabling one disables the other. Arrow binding toggles isBindingEnabled.
 *
 * Snap to midpoints is shown disabled — isMidpointSnappingEnabled does not exist in
 * @excalidraw/excalidraw@0.17.6; the snapping engine ignores it until upgrade.
 *
 * Right-click canvas context menu already exposes grid + object snap in 0.17.6;
 * arrow binding and midpoints are preferences-menu only (no public context-menu API).
 */
export default function ExcalidrawPreferences({ excalidrawAPI, appState }) {
    const gridOn = !!(appState?.gridSize);
    const objectsSnapOn = appState?.objectsSnapModeEnabled ?? true;
    const bindingOn = appState?.isBindingEnabled ?? true;

    const updateAppState = (patch) => {
        if (!excalidrawAPI) return;
        excalidrawAPI.updateScene({ appState: patch });
    };

    const toggleGrid = () => {
        if (gridOn) {
            updateAppState({ gridSize: null });
        } else {
            updateAppState({ gridSize: EXCALIDRAW_GRID_SIZE, objectsSnapModeEnabled: false });
        }
    };

    const toggleObjectsSnap = () => {
        if (objectsSnapOn) {
            updateAppState({ objectsSnapModeEnabled: false });
        } else {
            updateAppState({ objectsSnapModeEnabled: true, gridSize: null });
        }
    };

    const toggleBinding = () => {
        updateAppState({ isBindingEnabled: !bindingOn });
    };

    return (
        <MainMenu>
            <MainMenu.Group title="Preferences">
                <MainMenu.Item selected={bindingOn} onSelect={toggleBinding}>
                    Arrow binding
                </MainMenu.Item>
                <MainMenu.Item selected={gridOn} onSelect={toggleGrid}>
                    Toggle grid
                </MainMenu.Item>
                <MainMenu.Item selected={objectsSnapOn} onSelect={toggleObjectsSnap}>
                    Snap to objects
                </MainMenu.Item>
                <MainMenu.Item
                    selected={false}
                    disabled
                    title="Requires Excalidraw upgrade (not supported in 0.17.6)"
                    onSelect={() => {}}
                >
                    Snap to midpoints
                </MainMenu.Item>
            </MainMenu.Group>
        </MainMenu>
    );
}

/** Defaults for new boards / missing persisted fields. */
export function defaultCanvasAppState(overrides = {}) {
    return {
        gridSize: null,
        objectsSnapModeEnabled: true,
        isBindingEnabled: true,
        ...overrides,
    };
}

/** Subset of appState persisted to KV store. */
export function serializableCanvasAppState(appState) {
    if (!appState) return defaultCanvasAppState();
    return {
        viewBackgroundColor: appState.viewBackgroundColor || '#ffffff',
        gridSize: appState.gridSize ?? null,
        objectsSnapModeEnabled: appState.objectsSnapModeEnabled ?? true,
        isBindingEnabled: appState.isBindingEnabled ?? true,
    };
}
