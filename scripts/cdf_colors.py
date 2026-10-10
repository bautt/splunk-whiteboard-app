"""Pre-invert portal colors so Excalidraw's dark theme renders them as authored.

The whiteboard app runs Excalidraw with `theme: "dark"`, which paints the scene
and then applies the CSS filter

    invert(93%) hue-rotate(180deg)

to the whole canvas. A board therefore has to *store* the pre-image of the colors
it wants to show. This module inverts that filter analytically so the Cisco Data
Fabric board can be authored in the portal's own dark palette.

Forward model, all channels in 0..1 sRGB:

    invert(0.93):      c -> 0.93 - 0.86 * c
    hue-rotate(180):   c -> M @ c          (rows of M sum to 1)

    T = M @ (0.93 - 0.86 * S) = 0.93 - 0.86 * (M @ S)

Inverting:

    S = M^-1 @ ((0.93 - T) / 0.86)

Channels can land outside 0..1 for saturated targets; those get clamped, which
is why `pre_invert` also reports the resulting round-trip error.
"""

from __future__ import annotations

import math
import re

THEME_INVERT = 0.93
HUE_ROTATE_DEG = 180.0

# The portal page background is a photo (Assets/PortalBG-alt1.png); this is its
# mean color, used as the backdrop when flattening translucent fills.
PAGE_BACKDROP = "#280f29"


def _hue_rotate_matrix(deg: float) -> list[list[float]]:
    """The feColorMatrix hueRotate approximation CSS filters use."""
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return [
        [0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928],
        [0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283],
        [0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072],
    ]


def _inverse_3x3(m: list[list[float]]) -> list[list[float]]:
    (a, b, c), (d, e, f), (g, h, i) = m
    det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
    if abs(det) < 1e-12:
        raise ValueError("singular hue-rotate matrix")
    return [
        [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
        [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
        [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det],
    ]


M = _hue_rotate_matrix(HUE_ROTATE_DEG)
M_INV = _inverse_3x3(M)


def _mul(m: list[list[float]], v: tuple[float, float, float]) -> tuple[float, float, float]:
    return tuple(sum(m[r][k] * v[k] for k in range(3)) for r in range(3))  # type: ignore[return-value]


# ------------------------------------------------------------------ parse / fmt


def parse_color(value: str) -> tuple[float, float, float, float]:
    """Parse `#rgb`, `#rrggbb`, `rgb(...)` or `rgba(...)` into 0..1 RGBA."""
    v = (value or "").strip().lower()
    m = re.match(r"rgba?\(([^)]+)\)", v)
    if m:
        parts = [p.strip() for p in m.group(1).replace("/", ",").split(",")]
        r, g, b = (float(p) / 255.0 for p in parts[:3])
        a = float(parts[3]) if len(parts) > 3 else 1.0
        return r, g, b, a
    if v.startswith("#"):
        h = v[1:]
        if len(h) == 3:
            h = "".join(ch * 2 for ch in h)
        if len(h) == 6:
            h += "ff"
        if len(h) != 8:
            raise ValueError(f"unsupported color: {value!r}")
        r, g, b, a = (int(h[i : i + 2], 16) / 255.0 for i in (0, 2, 4, 6))
        return r, g, b, a
    named = {"white": (1.0, 1.0, 1.0, 1.0), "black": (0.0, 0.0, 0.0, 1.0), "none": (0.0, 0.0, 0.0, 0.0)}
    if v in named:
        return named[v]
    raise ValueError(f"unsupported color: {value!r}")


def to_hex(rgb: tuple[float, float, float]) -> str:
    return "#%02x%02x%02x" % tuple(max(0, min(255, round(c * 255))) for c in rgb)


def composite(fg: str, bg: str) -> str:
    """Flatten a translucent color over an opaque backdrop.

    Excalidraw has no per-color alpha (only a whole-element `opacity`), so every
    `rgba()` in the portal stylesheet gets baked against whatever is actually
    behind it — the page for cards, the card fill for labels.
    """
    fr, fg_, fb, fa = parse_color(fg)
    br, bg_, bb, _ = parse_color(bg)
    return to_hex(
        (fr * fa + br * (1 - fa), fg_ * fa + bg_ * (1 - fa), fb * fa + bb * (1 - fa))
    )


# ------------------------------------------------------------------- the filter


def apply_theme_filter(stored: str) -> str:
    """Forward model: what Excalidraw's dark theme shows for a stored color."""
    r, g, b, _ = parse_color(stored)
    mr, mg, mb = _mul(M, (r, g, b))
    return to_hex(tuple(THEME_INVERT - 0.86 * c for c in (mr, mg, mb)))


def pre_invert(target: str) -> tuple[str, float]:
    """Color to store so the dark theme renders `target`, plus the sRGB error.

    The error is the Euclidean distance in 0..255 sRGB between `target` and what
    the stored color actually renders as. It is non-zero only where the target
    lies outside the filter's reachable gamut and clamping kicks in.
    """
    tr, tg, tb, _ = parse_color(target)
    pre = tuple((THEME_INVERT - c) / 0.86 for c in (tr, tg, tb))
    stored = to_hex(_mul(M_INV, pre))  # to_hex clamps
    ar, ag, ab, _ = parse_color(apply_theme_filter(stored))
    err = math.dist((ar * 255, ag * 255, ab * 255), (tr * 255, tg * 255, tb * 255))
    return stored, err


def store(target: str, over: str | None = None) -> str:
    """Convenience: flatten `target` over `over` (if translucent), then pre-invert."""
    flat = composite(target, over) if over else target
    return pre_invert(flat)[0]


if __name__ == "__main__":
    # Round-trip report for the full portal palette.
    card = composite("rgba(4,25,43,.96)", PAGE_BACKDROP)
    outcome = composite("rgba(9,37,57,.96)", PAGE_BACKDROP)
    palette = [
        ("page backdrop", PAGE_BACKDROP, None),
        ("card fill", "rgba(4,25,43,.96)", PAGE_BACKDROP),
        ("outcome fill", "rgba(9,37,57,.96)", PAGE_BACKDROP),
        ("cloud-control fill", "#080f18", None),
        ("card stroke neutral", "#5c7183", None),
        ("source card stroke", "#8d9bad", None),
        ("cyan (mgmt/connector)", "#02c8ff", None),
        ("light cyan (main cards)", "#64e6ff", None),
        ("purple (AI band)", "#a855f7", None),
        ("blue (federated)", "#0a60ff", None),
        ("green (catalog)", "#39d98a", None),
        ("orange (splunk path)", "#ff9000", None),
        ("magenta", "#ff007f", None),
        ("navy", "#12275c", None),
        ("amber (accent detail)", "#ffb01a", None),
        ("title text", "#ffffff", card),
        ("subtitle text", "rgba(255,255,255,.56)", card),
        ("source item text", "rgba(255,255,255,.72)", card),
        ("outcome text", "rgba(255,255,255,.86)", outcome),
    ]
    print(f"{'role':<26} {'target':<9} {'store':<9} {'renders':<9} err")
    worst = 0.0
    for name, value, over in palette:
        flat = composite(value, over) if over else to_hex(parse_color(value)[:3])
        stored, err = pre_invert(flat)
        worst = max(worst, err)
        print(f"{name:<26} {flat:<9} {stored:<9} {apply_theme_filter(stored):<9} {err:5.1f}")
    print(f"\nworst-case sRGB error: {worst:.1f} / 441.7")
