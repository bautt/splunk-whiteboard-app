// Wraps a PNG data URL as a Dashboard Studio "absolute" layout JSON
// the user can paste into the DS Source editor.

export function buildDashboardStudioJSON({ title, pngDataUrl, width, height }) {
    const w = Math.max(200, Math.round(width || 1200));
    const h = Math.max(200, Math.round(height || 700));
    return {
        title: title || 'Whiteboard',
        description: 'Exported from Whiteboard App',
        visualizations: {
            viz_whiteboard: {
                type: 'splunk.image',
                options: {
                    src: pngDataUrl,
                    sizing: 'contain',
                    backgroundColor: 'transparent',
                },
            },
        },
        dataSources: {},
        defaults: { dataSources: {} },
        inputs: {},
        layout: {
            type: 'absolute',
            options: {
                width: w,
                height: h,
                display: 'auto',
            },
            structure: [
                {
                    item: 'viz_whiteboard',
                    type: 'block',
                    position: { x: 0, y: 0, w, h },
                },
            ],
            globalInputs: [],
        },
    };
}
