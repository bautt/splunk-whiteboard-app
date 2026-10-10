#!/usr/bin/env python3
"""Artwork for the Cisco Data Fabric portal board: tinted icon SVGs + bitmaps.

The portal tints one shared `<symbol>` per `<use>` via CSS. Excalidraw images
have no equivalent, so every distinct (symbol, fill, stroke, stroke-width)
combination becomes its own file. `file_id_for` is the single source of truth for
the naming, shared by this module's CLI and the board generator.

Also embeds the eight portal bitmaps, converting the Cisco Cloud Control logo's
hard black matte into alpha — the portal hides it with `mix-blend-mode: screen`,
which Excalidraw cannot express.

Rebuild after the extractor:  python3 scripts/cdf_assets.py
"""

from __future__ import annotations

import base64
import io
import json
import os
import re
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
PORTAL = os.path.join(ROOT, "assets", "reference", "cdf-portal")
BITMAPS = os.path.join(ROOT, "assets", "brand-icons", "cdf")
SPEC_PATH = os.path.join(PORTAL, "cdf-portal-spec.json")
OUT = os.path.join(BITMAPS, "cdf-files.json")

SVG_NS = "http://www.w3.org/2000/svg"
# Logos shipped with a black background instead of transparency.
MATTE_BLACK_LOGOS = {"cisco-cloud-control-logo.png"}


def slug(value: str | None) -> str:
    if not value:
        return "none"
    return re.sub(r"[^a-z0-9]+", "", value.lower()) or "none"


def glyph_name(item: dict) -> str:
    """CSS-derived name of a large source glyph, e.g. `edge` or `private`."""
    return next(c.replace("source-icon-", "") for c in item["classes"] if c != "source-icon")


def stroke_width_of(item: dict) -> float | None:
    """Absent `stroke-width` means the SVG default of 1 — but only if stroked."""
    return item.get("strokeWidth") or (1.0 if item.get("stroke") else None)


def file_id_for(item: dict) -> str:
    """Deterministic board fileId for an icon, source glyph, or bitmap item."""
    if item["kind"] == "icon":
        short = item["symbol"].replace("source-icon-", "")
        fill = item.get("fill")
    elif item["kind"] == "sourceIcon":
        short = f"src-{glyph_name(item)}"
        fill = "none"
    elif item["kind"] == "image":
        name = os.path.splitext(item["href"].split("/")[-1])[0]
        return f"cdf-img-{slug(name)}"
    else:
        raise ValueError(f"no artwork for kind {item['kind']!r}")
    return f"cdf-{short}-{slug(fill)}-{slug(item.get('stroke'))}"


# The platform container is stroked and filled with a four-stop gradient, which
# Excalidraw shapes cannot express. Rendering it as one SVG image keeps the
# gradient exact and costs a single element instead of dozens of strips.
GRADIENT_FRAME_ID = "cdf-platform-frame"


def gradient_frame_svg(spec: dict) -> str | None:
    """Standalone SVG for the gradient-framed platform container."""
    grad = spec["assets"]["gradients"].get("fabric-gradient")
    rect = next(
        (r for r in spec["items"] if r["kind"] == "rect" and "platform-container" in r["classes"]),
        None,
    )
    if not grad or not rect:
        return None

    sw = rect.get("strokeWidth") or 6
    inset = sw / 2  # keep the stroke inside the viewBox
    coords = " ".join(f'{k}="{v}"' for k, v in grad["coords"].items())
    stops = "".join(
        f'<stop offset="{s["offset"]}" stop-color="{s["color"]}"/>' for s in grad["stops"]
    )
    return (
        f'<svg xmlns="{SVG_NS}" viewBox="0 0 {rect["w"]} {rect["h"]}">'
        f'<defs><linearGradient id="g" {coords}>{stops}</linearGradient></defs>'
        f'<rect x="{inset}" y="{inset}" width="{rect["w"] - sw}" height="{rect["h"] - sw}" '
        f'rx="{rect["rx"]}" fill="url(#g)" fill-opacity=".05" '
        f'stroke="url(#g)" stroke-width="{sw}"/></svg>'
    )


def icon_variants(spec: dict) -> dict[str, dict]:
    """fileId -> {viewBox, inner, fill, stroke, strokeWidth} for every tint used."""
    symbols = spec["assets"]["symbols"]
    glyphs = spec["assets"]["sourceIcons"]
    variants: dict[str, dict] = {}

    for item in spec["items"]:
        if item["kind"] == "icon":
            art = symbols.get(item["symbol"])
            if art is None:
                raise KeyError(f"missing symbol definition: {item['symbol']}")
            fill = item.get("fill")
        elif item["kind"] == "sourceIcon":
            art = glyphs.get(glyph_name(item))
            if art is None:
                raise KeyError(f"missing source glyph: {glyph_name(item)}")
            fill = "none"
        else:
            continue

        variants[file_id_for(item)] = {
            "viewBox": art["viewBox"],
            "inner": art["inner"],
            "fill": fill,
            "stroke": item.get("stroke"),
            "strokeWidth": stroke_width_of(item),
        }
    return variants


def build_svg(v: dict) -> str:
    attrs = [f'xmlns="{SVG_NS}"', f'viewBox="{v["viewBox"]}"', f'fill="{v["fill"] or "none"}"']
    if v["stroke"]:
        attrs += [
            f'stroke="{v["stroke"]}"',
            f'stroke-width="{v["strokeWidth"]}"',
            'stroke-linecap="round"',
            'stroke-linejoin="round"',
        ]
    # Presentation attributes already on the inner markup (e.g. `fill="none"` on
    # the search glyph's circle) still win over these inherited defaults.
    return f"<svg {' '.join(attrs)}>{v['inner']}</svg>"


def data_url(payload: bytes, mime: str) -> str:
    return f"data:{mime};base64," + base64.b64encode(payload).decode()


# Bitmaps are embedded as data URLs inside the board document, so each one is
# capped at twice its on-board size — enough for high-DPI screens and export,
# without carrying e.g. a 1280px Azure logo for a 32px slot.
RETINA = 2


def prepare_bitmap(path: str, display: tuple[float, float]) -> bytes:
    """Embed-ready PNG: matte removed where needed, capped at 2x display size.

    The black matte handling mimics `mix-blend-mode: screen`, which keeps the
    lighter of backdrop and source. Against the near-black card that is the same
    as using luminance for alpha, and it leaves the colored swirl intact.
    """
    from PIL import Image

    im = Image.open(path)
    if os.path.basename(path) in MATTE_BLACK_LOGOS:
        rgb = im.convert("RGB")
        im = rgb.convert("RGBA")
        im.putalpha(rgb.convert("L"))
    else:
        im = im.convert("RGBA")

    cap = (max(1, round(display[0] * RETINA)), max(1, round(display[1] * RETINA)))
    if im.width > cap[0] or im.height > cap[1]:
        im.thumbnail(cap, Image.LANCZOS)

    buf = io.BytesIO()
    im.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def build_files(spec: dict) -> list[dict]:
    now = int(time.time() * 1000)
    files = []

    for file_id, variant in sorted(icon_variants(spec).items()):
        files.append(
            {
                "id": file_id,
                "dataURL": data_url(build_svg(variant).encode(), "image/svg+xml"),
                "mimeType": "image/svg+xml",
                "created": now,
                "lastRetrieved": now,
            }
        )

    frame = gradient_frame_svg(spec)
    if frame:
        files.append(
            {
                "id": GRADIENT_FRAME_ID,
                "dataURL": data_url(frame.encode(), "image/svg+xml"),
                "mimeType": "image/svg+xml",
                "created": now,
                "lastRetrieved": now,
            }
        )

    # Largest on-board box each bitmap is drawn into.
    display: dict[str, tuple[float, float]] = {}
    for item in spec["items"]:
        if item["kind"] == "image":
            prev = display.get(item["href"], (0.0, 0.0))
            display[item["href"]] = (max(prev[0], item["w"]), max(prev[1], item["h"]))

    for href in spec["images"]:
        name = href.split("/")[-1]
        path = os.path.join(BITMAPS, name)
        if not os.path.exists(path):
            raise FileNotFoundError(f"{path} — download the portal bitmaps first")
        payload = prepare_bitmap(path, display[href])
        files.append(
            {
                "id": file_id_for({"kind": "image", "href": href}),
                "dataURL": data_url(payload, "image/png"),
                "mimeType": "image/png",
                "created": now,
                "lastRetrieved": now,
            }
        )
    return files


def load_files() -> list[dict]:
    """Board files built earlier by this module's CLI."""
    with open(OUT) as f:
        return json.load(f)


def main() -> None:
    spec = json.load(open(SPEC_PATH))
    files = build_files(spec)
    with open(OUT, "w") as f:
        json.dump(files, f)

    svgs = sum(1 for f in files if f["mimeType"] == "image/svg+xml")
    size = sum(len(f["dataURL"]) for f in files)
    print(f"Wrote {os.path.relpath(OUT, ROOT)}")
    print(f"  {svgs} tinted icon SVGs + {len(files) - svgs} bitmaps")
    print(f"  embedded payload: {size / 1024:.0f} KiB")


if __name__ == "__main__":
    main()
