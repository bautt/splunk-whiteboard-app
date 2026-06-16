#!/usr/bin/env python3
"""Generate the gradient easel alt app icon (whiteboard doodles, transparent bg)."""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "src/package/appserver/static"
ASSETS = ROOT / "assets"

SIZE = 400
# Sampled from the reference easel icon.
GRAD_LEFT = (204, 39, 127)
GRAD_RIGHT = (241, 125, 71)
INK = (255, 255, 255, 255)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_rgb(c1, c2, t):
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))


def make_gradient(w: int, h: int) -> Image.Image:
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    for x in range(w):
        t = x / max(w - 1, 1)
        rgb = lerp_rgb(GRAD_LEFT, GRAD_RIGHT, t)
        arr[:, x] = rgb
    return Image.fromarray(arr, "RGB")


def rounded_rect_mask(draw: ImageDraw.ImageDraw, box, radius: int, fill=255):
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def build_mask(size: int = SIZE) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)

    # Main board
    board = (40, 34, 360, 300)
    rounded_rect_mask(d, board, 34)

    # Top clip/tab
    tab = [(178, 18), (222, 18), (214, 34), (186, 34)]
    d.polygon(tab, fill=255)

    # Crossbar
    d.rounded_rectangle((118, 300, 282, 314), radius=7, fill=255)

    # Legs (thick angled capsules via polygons)
    d.polygon([(150, 308), (176, 308), (118, 372), (96, 372)], fill=255)
    d.polygon([(224, 308), (250, 308), (304, 372), (282, 372)], fill=255)

    return mask


def draw_whiteboard_doodles(draw: ImageDraw.ImageDraw, ink=INK):
    sw = 7
    cap = "round"
    join = "round"

    # Flowchart box
    draw.rounded_rectangle((72, 78, 148, 128), radius=10, outline=ink, width=sw)

    # Circle node
    draw.ellipse((248, 74, 312, 138), outline=ink, width=sw)

    # Arrow between them
    draw.line([(154, 102), (242, 102)], fill=ink, width=sw)
    draw.polygon([(242, 102), (224, 90), (224, 114)], fill=ink)

    # Sticky note (outline)
    draw.rounded_rectangle((86, 156, 132, 198), radius=6, outline=ink, width=sw)
    draw.polygon([(118, 156), (132, 156), (132, 170)], fill=ink)

    # Checklist lines
    for y in (170, 188, 206):
        draw.line([(156, y), (176, y)], fill=ink, width=sw)
        draw.line([(186, y), (300, y)], fill=ink, width=sw - 1)

    # Handwriting scribbles
    def scribble(y0, amp=6):
        pts = []
        for x in range(156, 306, 8):
            t = (x - 156) / 150
            y = y0 + math.sin(t * math.pi * 2.2) * amp * (0.6 + 0.4 * math.sin(t * 5))
            pts.append((x, y))
        draw.line(pts, fill=ink, width=sw - 1, joint=join)

    scribble(228, 5)
    scribble(252, 7)
    scribble(276, 4)


def render_icon(size: int = SIZE) -> Image.Image:
    grad = make_gradient(size, size).resize((size, size))
    mask = build_mask(size).resize((size, size), Image.Resampling.LANCZOS)

    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    icon.paste(grad, mask=mask)

    # Scale doodle coordinates when not 400
    scale = size / SIZE
    doodle_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if scale == 1:
        draw = ImageDraw.Draw(doodle_layer)
        draw_whiteboard_doodles(draw)
    else:
        hi = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        draw_whiteboard_doodles(ImageDraw.Draw(hi))
        doodle_layer = hi.resize((size, size), Image.Resampling.LANCZOS)

    icon = Image.alpha_composite(icon, doodle_layer)
    return icon


def main():
    master = render_icon(400)
    master.save(ASSETS / "listing_icon_alt_400.png")

    outputs = {
        OUT_DIR / "appIconAlt.png": 36,
        OUT_DIR / "appIconAlt_2x.png": 72,
        ASSETS / "listing_icon_alt_200.png": 200,
    }
    for path, px in outputs.items():
        render_icon(px).save(path)
        print(f"wrote {path} ({px}x{px})")
    print(f"wrote {ASSETS / 'listing_icon_alt_400.png'} (400x400)")


if __name__ == "__main__":
    main()
