/**
 * Tint raw SVG markup to a single color (marketing icons, shape icons, DRP icons).
 * Strips embedded <style> blocks and Illustrator class fills so hardcoded palette
 * colors cannot override the chosen tint.
 */

export function tintSvgMarkup(svgText, color) {
    if (!svgText || typeof svgText !== 'string') return svgText;

    let svg = svgText
        .replace(/<\?xml[^?]*\?>\s*/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    svg = svg.replace(/\sclass="[^"]*"/gi, '');
    svg = svg.replace(/\sclass='[^']*'/gi, '');

    svg = svg.replace(/\bfill="(?!none)[^"]*"/gi, `fill="${color}"`);
    svg = svg.replace(/\bfill='(?!none)[^']*'/gi, `fill='${color}'`);
    svg = svg.replace(/\bstroke="(?!none)[^"]*"/gi, `stroke="${color}"`);
    svg = svg.replace(/\bstroke='(?!none)[^']*'/gi, `stroke='${color}'`);

    svg = svg.replace(/\bfill="currentColor"/gi, `fill="${color}"`);
    svg = svg.replace(/\bstroke="currentColor"/gi, `stroke="${color}"`);

    svg = svg.replace(/\sstyle="([^"]*)"/gi, (_, style) => {
        const next = style
            .replace(/fill\s*:\s*(?!none)[^;"]+/gi, `fill:${color}`)
            .replace(/stroke\s*:\s*(?!none)[^;"]+/gi, `stroke:${color}`);
        return ` style="${next}"`;
    });

    svg = svg.replace(/^(\s*<svg\b[^>]*)(>)/i, (_, tag, close) => {
        const cleaned = tag.replace(/\sfill="[^"]*"/i, '').replace(/\sstroke="[^"]*"/i, '');
        return `${cleaned} fill="${color}"${close}`;
    });

    return svg;
}

export function svgMarkupToDataUrl(svgMarkup) {
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgMarkup)))}`;
}

export function tintSvgDataUrl(svgText, color) {
    return svgMarkupToDataUrl(tintSvgMarkup(svgText, color));
}

/** Build a data URL for a library icon (respects tintable flag). */
export function iconToDataUrl(icon, color = '#000000') {
    if (!icon?.svg) return null;
    if (icon.tintable === false) return svgMarkupToDataUrl(icon.svg);
    return tintSvgDataUrl(icon.svg, color);
}
