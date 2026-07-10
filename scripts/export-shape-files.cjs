#!/usr/bin/env node
/** Export tinted Splunk shape icon files for whiteboard JSON bundles. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../src');
const NODE_MODULES = path.join(ROOT, 'node_modules');

// Resolve deps from src/node_modules when script runs outside src/
const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
    if (!request.startsWith('.') && !path.isAbsolute(request)) {
        try {
            return origResolve.call(this, request, { paths: [NODE_MODULES] }, isMain, options);
        } catch (_) {
            /* fall through */
        }
    }
    return origResolve.call(this, request, parent, isMain, options);
};

const babel = require('@babel/core');

function transpileRequire(relPath) {
    const filePath = path.join(ROOT, relPath);
    const src = fs.readFileSync(filePath, 'utf8');
    const { code } = babel.transformSync(src, {
        filename: filePath,
        presets: ['@splunk/babel-preset'],
    });
    const mod = { exports: {} };
    const dirname = path.dirname(filePath);
    const req = (p) => {
        if (p.startsWith('.')) return transpileRequire(path.relative(ROOT, path.join(dirname, p)));
        return require(p);
    };
    // eslint-disable-next-line no-new-func
    const fn = new Function('exports', 'require', 'module', '__filename', '__dirname', code);
    fn(mod.exports, req, mod, filePath, dirname);
    return mod.exports;
}

const { getShapeSvgMarkup } = transpileRequire('web/lib/shapeIcons.js');
const { tintSvgDataUrl } = transpileRequire('web/lib/tintSvg.js');

const SPECS = process.argv[2] ? JSON.parse(process.argv[2]) : [];
const now = Date.now();
const files = [];

for (const [shapeId, colorHex] of SPECS) {
    const color = colorHex.startsWith('#') ? colorHex : `#${colorHex}`;
    const fileId = `shape-${shapeId}-${colorHex.replace('#', '')}`;
    const svg = getShapeSvgMarkup(shapeId);
    if (!svg) {
        console.error(`Missing SVG for shape: ${shapeId}`);
        process.exit(1);
    }
    files.push({
        id: fileId,
        dataURL: tintSvgDataUrl(svg, color),
        mimeType: 'image/svg+xml',
        created: now,
        lastRetrieved: now,
    });
}

process.stdout.write(JSON.stringify(files));
