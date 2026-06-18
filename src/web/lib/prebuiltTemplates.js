/**
 * Shipped example templates (from assets/prebuilt-templates/).
 * Regenerate: python3 scripts/export-kv-templates.py
 */
import { sanitizeElementsForPersistence } from './build';

import plattformWbDark from '../../../assets/prebuilt-templates/plattform-wb-dark.whiteboard.json';
import dataFabric from '../../../assets/prebuilt-templates/data-fabric.whiteboard.json';
import dataFabricMdl from '../../../assets/prebuilt-templates/data-fabric-mdl.whiteboard.json';

function fromBundle(bundle) {
    const board = bundle.board || {};
    return {
        id: bundle.id,
        label: bundle.name,
        description: bundle.description || '',
        elements: sanitizeElementsForPersistence(board.elements || []),
        files: board.files || [],
    };
}

export const PREBUILT_TEMPLATES = [
    fromBundle(plattformWbDark),
    fromBundle(dataFabric),
    fromBundle(dataFabricMdl),
];

export default PREBUILT_TEMPLATES;
