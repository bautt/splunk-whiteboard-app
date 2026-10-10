#!/usr/bin/env python3
"""Extract the Cisco Data Fabric portal architecture SVG into a normalized spec.

Source: https://splunk.github.io/CDF_Portal/cisco-data-fabric.html

The portal diagram is a hand-authored SVG (viewBox 0 0 2040 1288) whose geometry
we transcribe 1:1 rather than redraw. This script flattens the nested group
transforms, resolves the stylesheet cascade down to concrete fill/stroke/font
values, and carries each node's `data-key` so the board generator can attach
build steps, links, and the detail copy from cdf-architecture.js.

Re-run after the portal changes:  python3 scripts/extract-cdf-portal-svg.py
"""

from __future__ import annotations

import json
import os
import re
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
PORTAL = os.path.join(HERE, "..", "assets", "reference", "cdf-portal")
OUT = os.path.join(PORTAL, "cdf-portal-spec.json")

# Decorative layers that exist only for the portal's glass/glow look or for the
# CSS animations. None of it survives the trip into Excalidraw.
SKIP_CLASSES = {
    "frame-reflection",
    "frame-reflection-wrap",
    "source-glass-reflection",
    "source-glass-reflection-wrap",
    "source-data-pulse",
    "splunk-path-pulse",
}


# --------------------------------------------------------------------------- CSS


def parse_css(text: str) -> list[tuple[list[tuple[list[str], str | None]], dict[str, str]]]:
    """Return [(selector, declarations)] in source order.

    A selector is a list of (classes, tag) parts, outermost first, so
    `.outcome-row .outcome-card` becomes [(["outcome-row"], None),
    (["outcome-card"], None)] and `.mdl-details text` becomes
    [(["mdl-details"], None), ([], "text")]. Anything using pseudo-classes,
    attributes or child combinators is dropped — the static export only needs
    the resting state.
    """
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    rules = []
    for raw_sel, raw_decl in re.findall(r"([^{}]+)\{([^{}]*)\}", text):
        decls = {}
        for part in raw_decl.split(";"):
            if ":" not in part:
                continue
            prop, _, val = part.partition(":")
            decls[prop.strip()] = val.strip()
        if not decls:
            continue
        for sel in raw_sel.split(","):
            sel = sel.strip()
            if not sel or not sel.startswith(".") or any(c in sel for c in ":[>"):
                continue
            parts = []
            for token in sel.split():
                classes = re.findall(r"\.([A-Za-z0-9_-]+)", token)
                tag = re.match(r"([a-zA-Z][a-zA-Z0-9]*)", token)
                parts.append((classes, tag.group(1) if tag else None))
            if all(classes or tag for classes, tag in parts):
                rules.append((parts, decls))
    return rules


def clean_value(value: str | None, accent: str | None) -> str | None:
    """Strip `!important` and resolve the one custom property the portal uses.

    `.source-node .source-item-icon` wins with `!important`, so the per-node
    `--source-accent` beats the per-chip `.source-item-icon-*` classes. That is
    why e.g. the Lakehouse chips render navy rather than green.
    """
    if value is None:
        return None
    value = value.replace("!important", "").strip()
    m = re.fullmatch(r"var\(\s*--source-accent\s*(?:,[^)]*)?\)", value)
    if m:
        return accent
    return value


def resolve_style(rules, chain: list[tuple[set[str], str]]) -> dict[str, str]:
    """Apply the cascade for an element with the given ancestor chain.

    Each chain entry is (classes, tag); `chain[-1]` is the element itself. The
    portal stylesheet is flat — every rule is one or two simple selectors — so
    source order alone decides the winner. That is what makes the
    `.source-accent-* .source-card` strokes lose to the later blanket
    `stroke:#8d9bad` rule, exactly as the browser renders it.
    """

    def matches(part, entry) -> bool:
        classes, tag = part
        own_classes, own_tag = entry
        return set(classes) <= own_classes and (tag is None or tag == own_tag)

    style: dict[str, str] = {}
    for parts, decls in rules:
        if not matches(parts[-1], chain[-1]):
            continue
        # Match the ancestor parts right-to-left against the chain.
        idx = len(chain) - 2
        ok = True
        for part in reversed(parts[:-1]):
            while idx >= 0 and not matches(part, chain[idx]):
                idx -= 1
            if idx < 0:
                ok = False
                break
            idx -= 1
        if ok:
            style.update(decls)
    return style


FONT_RE = re.compile(r"(?P<weight>\d{3})?\s*(?P<size>[\d.]+)px")


def parse_font(style: dict[str, str]) -> tuple[float | None, int | None]:
    size = weight = None
    if "font" in style:
        m = FONT_RE.search(style["font"])
        if m:
            size = float(m.group("size"))
            weight = int(m.group("weight")) if m.group("weight") else 400
    if "font-size" in style:
        m = re.search(r"([\d.]+)px", style["font-size"])
        if m:
            size = float(m.group(1))
    if "font-weight" in style:
        try:
            weight = int(style["font-weight"])
        except ValueError:
            pass
    return size, weight


# --------------------------------------------------------------------------- SVG

# SVG presentation attributes are unitless (`translate(0 -58)`) while the
# stylesheet writes CSS lengths (`translate(-12px,-4px)`); accept both.
_N = r"([-\d.]+)(?:px)?"
TRANSLATE_RE = re.compile(rf"translate\(\s*{_N}[\s,]+{_N}\s*\)")
TRANSLATE_ONE_RE = re.compile(rf"translate([XY])\(\s*{_N}\s*\)")
SCALE_RE = re.compile(rf"scale\(\s*{_N}\s*\)")


def parse_transform(value: str | None) -> tuple[float, float, float]:
    if not value:
        return 0.0, 0.0, 1.0
    dx = dy = 0.0
    scale = 1.0
    m = TRANSLATE_RE.search(value)
    if m:
        dx, dy = float(m.group(1)), float(m.group(2))
    else:
        m = TRANSLATE_ONE_RE.search(value)
        if m:
            if m.group(1) == "X":
                dx = float(m.group(2))
            else:
                dy = float(m.group(2))
    m = SCALE_RE.search(value)
    if m:
        scale = float(m.group(1))
    return dx, dy, scale


def num(el, attr, default=0.0) -> float:
    v = el.get(attr)
    return float(v) if v not in (None, "") else default


def strip_ns(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def extract_svg_source(html: str) -> str:
    start = html.index('<svg id="architecture-canvas"')
    end = html.index("</svg>", start) + len("</svg>")
    svg = html[start:end]
    # xlink:href appears on <use>/<image>; declare the namespace so ET accepts it.
    return svg.replace(
        "<svg ",
        '<svg xmlns="http://www.w3.org/2000/svg" '
        'xmlns:xlink="http://www.w3.org/1999/xlink" ',
        1,
    )


def walk(node, rules, items, dx=0.0, dy=0.0, scale=1.0, chain=None, key=None, accent=None):
    chain = chain or []
    classes = set((node.get("class") or "").split())
    if classes & SKIP_CLASSES:
        return
    tag = strip_ns(node.tag)
    if tag in ("defs", "title", "desc", "animate", "clipPath", "symbol", "linearGradient", "filter"):
        return

    tdx, tdy, tscale = parse_transform(node.get("transform"))
    dx, dy = dx + tdx * scale, dy + tdy * scale
    scale *= tscale
    chain = chain + [(classes, tag)]
    key = node.get("data-key") or key
    m = re.search(r"--source-accent:\s*(#[0-9a-fA-F]{3,8})", node.get("style") or "")
    if m:
        accent = m.group(1)

    common = {"classes": sorted(classes), "key": key}

    if tag == "rect":
        style = resolve_style(rules, chain)
        items.append(
            {
                "kind": "rect",
                "x": num(node, "x") * scale + dx,
                "y": num(node, "y") * scale + dy,
                "w": num(node, "width") * scale,
                "h": num(node, "height") * scale,
                "rx": num(node, "rx") * scale,
                "fill": clean_value(style.get("fill"), accent),
                "stroke": clean_value(style.get("stroke"), accent),
                "strokeWidth": float(style.get("stroke-width", 1)) if style.get("stroke-width") else None,
                "dash": style.get("stroke-dasharray"),
                **common,
            }
        )
    elif tag == "text":
        style = resolve_style(rules, chain)
        size, weight = parse_font(style)
        text = "".join(node.itertext()).strip()
        if text:
            items.append(
                {
                    "kind": "text",
                    "x": num(node, "x") * scale + dx,
                    "baseline": num(node, "y") * scale + dy,
                    "text": text,
                    "anchor": node.get("text-anchor", "start"),
                    "fill": clean_value(style.get("fill"), accent),
                    "fontSize": (size or 12) * scale,
                    "fontWeight": weight or 400,
                    "transform": style.get("text-transform"),
                    **common,
                }
            )
    elif tag == "image":
        items.append(
            {
                "kind": "image",
                "x": num(node, "x") * scale + dx,
                "y": num(node, "y") * scale + dy,
                "w": num(node, "width") * scale,
                "h": num(node, "height") * scale,
                "href": node.get("href") or node.get("{http://www.w3.org/1999/xlink}href"),
                **common,
            }
        )
    elif tag == "use":
        style = resolve_style(rules, chain)
        href = (node.get("href") or node.get("{http://www.w3.org/1999/xlink}href") or "").lstrip("#")
        # `.source-item-icon` nudges its glyph with a CSS transform; fold it in.
        ox, oy, _ = parse_transform(style.get("transform"))
        items.append(
            {
                "kind": "icon",
                "x": num(node, "x") * scale + dx + ox * scale,
                "y": num(node, "y") * scale + dy + oy * scale,
                "w": num(node, "width", 24) * scale,
                "h": num(node, "height", 24) * scale,
                "symbol": href,
                "fill": clean_value(style.get("fill") or style.get("color"), accent),
                "stroke": clean_value(style.get("stroke"), accent),
                "strokeWidth": float(style["stroke-width"]) if style.get("stroke-width") else None,
                **common,
            }
        )
    elif "source-icon" in classes and tag == "g":
        # One of the five large source glyphs. Its outline lives in child <path>
        # elements; `extract_assets` lifts the whole group into a standalone SVG,
        # so here we only need the placement box.
        style = resolve_style(rules, chain)
        items.append(
            {
                "kind": "sourceIcon",
                "x": dx,
                "y": dy,
                "size": 24.0 * scale,
                "stroke": clean_value(style.get("stroke"), accent),
                "strokeWidth": float(style["stroke-width"]) if style.get("stroke-width") else None,
                **common,
            }
        )
        return

    for child in node:
        walk(child, rules, items, dx, dy, scale, chain, key, accent)


# -------------------------------------------------------------------- node copy


def extract_assets(svg: str) -> dict[str, dict]:
    """Lift the reusable icon artwork out of the SVG as standalone markup.

    Two shapes of source: `<symbol>` definitions referenced by `<use>`, and the
    five large per-source glyphs that are inlined as `<g class="source-icon …">`.
    Both come out as (viewBox, inner markup) pairs that the generator can wrap
    into tinted standalone SVG files.
    """
    symbols = {}
    for sym in re.finditer(
        r'<symbol id="([^"]+)" viewBox="([^"]+)">(.*?)</symbol>', svg, flags=re.S
    ):
        symbols[sym.group(1)] = {"viewBox": sym.group(2), "inner": sym.group(3).strip()}

    source_icons = {}
    for g in re.finditer(
        r'<g class="source-icon source-icon-([a-z]+)"[^>]*>(.*?)</g>', svg, flags=re.S
    ):
        source_icons[g.group(1)] = {"viewBox": "0 0 24 24", "inner": g.group(2).strip()}

    gradients = {}
    for grad in re.finditer(
        r'<linearGradient id="([^"]+)"([^>]*)>(.*?)</linearGradient>', svg, flags=re.S
    ):
        stops = [
            {"offset": m.group(1), "color": m.group(2)}
            for m in re.finditer(
                r'<stop offset="([^"]+)" stop-color="([^"]+)"', grad.group(3)
            )
        ]
        if stops:
            gradients[grad.group(1)] = {
                "coords": dict(re.findall(r'(x1|y1|x2|y2)="([^"]+)"', grad.group(2))),
                "stops": stops,
            }

    return {"symbols": symbols, "sourceIcons": source_icons, "gradients": gradients}


def extract_details(js: str) -> dict[str, dict[str, str]]:
    """Pull the per-node layer/title/description/href map out of the portal JS."""
    block = js[js.index("const details = {") : js.index("\n  };", js.index("const details = {"))]
    details = {}
    for line in block.splitlines():
        m = re.match(r"\s*'?([\w-]+)'?:\s*\{(.*)\},?\s*$", line)
        if not m:
            continue
        key, body = m.group(1), m.group(2)
        entry = {}
        for field in ("layer", "title", "description", "href"):
            fm = re.search(rf"\b{field}:\s*'((?:[^'\\]|\\.)*)'", body)
            if fm:
                entry[field] = fm.group(1).replace("\\'", "'")
        if entry:
            details[key] = entry
    return details


def main() -> None:
    html = open(os.path.join(PORTAL, "cisco-data-fabric.html")).read()
    css = open(os.path.join(PORTAL, "cdf-architecture.css")).read()
    js = open(os.path.join(PORTAL, "cdf-architecture.js")).read()

    rules = parse_css(css)
    svg = extract_svg_source(html)
    root = ET.fromstring(svg)
    items: list[dict] = []
    walk(root, rules, items)

    spec = {
        "source": "https://splunk.github.io/CDF_Portal/cisco-data-fabric.html",
        "viewBox": [float(v) for v in root.get("viewBox").split()],
        "details": extract_details(js),
        "assets": extract_assets(svg),
        "images": sorted({i["href"] for i in items if i["kind"] == "image"}),
        "items": items,
    }
    with open(OUT, "w") as f:
        json.dump(spec, f, indent=2)

    kinds: dict[str, int] = {}
    for it in items:
        kinds[it["kind"]] = kinds.get(it["kind"], 0) + 1
    print(f"Wrote {os.path.relpath(OUT, os.path.join(HERE, '..'))}")
    print(f"  viewBox: {spec['viewBox']}")
    print(f"  items:   {kinds}")
    print(f"  assets:  {len(spec['assets']['symbols'])} symbols, "
          f"{len(spec['assets']['sourceIcons'])} source glyphs, {len(spec['images'])} bitmaps")
    print(f"  details: {len(spec['details'])} nodes, "
          f"{sum(1 for d in spec['details'].values() if 'href' in d)} with links")

    unresolved = [
        it for it in items
        if any(str(it.get(k) or "").startswith("var(") for k in ("fill", "stroke"))
    ]
    if unresolved:
        print(f"  WARNING: {len(unresolved)} items with unresolved custom properties")


if __name__ == "__main__":
    main()
