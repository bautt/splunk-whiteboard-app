#!/usr/bin/env python3
"""Generate the Cisco Data Fabric portal architecture board.

Transcribes the portal SVG (see extract-cdf-portal-svg.py) 1:1 into Excalidraw
elements at the source scale of 2040x1288, keeps the portal's own colors, and
layers the whiteboard app's interactivity on top:

  * `customData.build.step` drives the progressive reveal, starting at Machine
    Data Analytics in the center and ending with the business outcomes;
  * `link` carries the portal's 15 demo URLs onto the matching cards;
  * `customData.cdf` keeps each node's layer/title/description for a detail panel.

The board is stored with `theme: "light"` on a dark canvas on purpose. The app's
dark theme would push the scene through `invert(93%) hue-rotate(180deg)`, and the
portal's saturated accents cannot survive that round trip (see cdf_colors.py).

Usage:
    python3 scripts/generate-cdf-portal-board.py            # write JSON only
    python3 scripts/generate-cdf-portal-board.py --upload   # also push to Splunk
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cdf_assets
from cdf_colors import composite, parse_color, to_hex
from wbgen_common import LINE_HEIGHT, base_el, nid, text_width

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
SPEC_PATH = os.path.join(ROOT, "assets", "reference", "cdf-portal", "cdf-portal-spec.json")
OUT_PATH = os.path.join(ROOT, "assets", "generated", "Cisco_Data_Fabric_Portal.whiteboard.json")

BOARD_NAME = "Cisco Data Fabric — Architecture (Portal)"
PORTAL_BASE = "https://splunk.github.io/CDF_Portal/"

# Flat stand-in for the portal's photographic page background. Slightly darker
# than the card fill so the cards still read as raised.
CANVAS_BG = "#040e18"
FONT_FAMILY = 2  # Excalidraw's Helvetica/Nunito family

# Attribution line placed clear of the artwork, aligned with the left margin.
CREDIT_INSET = 42  # matches the "BUSINESS OUTCOMES" kicker
CREDIT_GAP = 28
CREDIT_COLOR = "#6d7f91"

# Progressive reveal, as requested: center first, then the data flow top to
# bottom, then outward from the center, then up from Cisco Cloud Control, and
# the business outcomes last. Step 0 is the always-visible frame.
STEP_BY_KEY = {
    "platform": 1,
    "edge": 2,
    "datacenter": 2,
    "cloud": 2,
    "saas": 2,
    "lakehouse": 2,
    "management": 4,
    "as": 5,
    "go": 5,
    "shp": 5,
    "ep": 5,
    "ip": 5,
    "catalog": 7,
    "mdl": 9,
    "federated": 10,
    "edl": 11,
    # The AI and collaboration layer builds before Cisco Cloud Control: it is
    # what Cloud Control then operates on, so the story reads bottom-up.
    "ai": 12,
    "assistant": 12,
    "mcp": 12,
    "launchpad": 12,
    "canvas": 12,
    "cloud-control": 13,
    "outcome-alerts": 14,
    "outcome-dashboards": 14,
    "outcome-agents": 14,
    "outcome-tco": 14,
    "outcome-workloads": 14,
    "outcome-reuse": 14,
}

# Keyless decoration — connectors and free-standing labels — keyed by the rounded
# top-left corner from the spec.
STEP_BY_POSITION = {
    (182, 162): 3,     # the five source feeds into Data Management
    (490, 162): 3,
    (798, 162): 3,
    (1106, 162): 3,
    (1414, 162): 3,
    (798, 400): 6,     # Data Management into Catalog
    (798, 520): 8,     # Catalog into Machine Data Analytics (the hot path)
    (278, 520): 9,     # Catalog into Machine Data Lake
    (480, 693): 9,     # "Promote"
    (510, 682): 9,
    (1318, 520): 10,   # Catalog into Federated Search
    (1060, 693): 10,   # "SPL2"
    (1090, 682): 10,
    (1520, 690): 11,   # Federated Search to External Data Lakes, both ways
    (1520, 700): 11,
    (798, 820): 12,    # Machine Data Analytics into the AI layer
    (810, 820): 12,
    (798, 1020): 13,   # AI layer into Cisco Cloud Control
    (810, 1020): 13,
    (42, 1214): 14,    # "BUSINESS OUTCOMES"
}


# Readability bump for the small labels sitting inside the large bands and
# cards. The portal is a web page you can zoom; a whiteboard gets read from
# across the room, and at 1:1 these captions are far too timid for the area
# they occupy. Headings (18px and up) are already big enough and stay put.
#
# 11px is deliberately excluded: that is the source-card chip row, where the
# labels clear their icons by only 6px. Growing them would undo that spacing.
FONT_BUMP = {8: 10, 10: 13, 12: 14, 13: 15}


def font_size_for(item: dict) -> float:
    return FONT_BUMP.get(item["fontSize"], item["fontSize"])


def step_for(item: dict) -> int:
    key = item.get("key")
    if key in STEP_BY_KEY:
        return STEP_BY_KEY[key]
    pos = (round(item["x"]), round(item.get("y", item.get("baseline", 0))))
    if pos in STEP_BY_POSITION:
        return STEP_BY_POSITION[pos]
    return 0  # platform container, Splunk logo, "Platform" label


def absolute(href: str) -> str:
    return href if href.startswith("http") else PORTAL_BASE + href


def opaque(color: str | None, backdrop: str) -> str:
    """Portal color as an opaque hex, flattened over whatever sits behind it."""
    if not color or color in ("none", "transparent"):
        return "transparent"
    if color.startswith("url("):
        return "transparent"  # gradients have no Excalidraw equivalent
    r, g, b, a = parse_color(color)
    return to_hex((r, g, b)) if a >= 1.0 else composite(color, backdrop)


class Builder:
    def __init__(self, spec: dict):
        self.spec = spec
        self.details = spec["details"]
        self.elements: list[dict] = []
        # Card rects, smallest first, so `backdrop_at` finds the innermost one.
        self.cards = sorted(
            (
                r
                for r in spec["items"]
                if r["kind"] == "rect" and not any("connector" in c for c in r["classes"])
            ),
            key=lambda r: r["w"] * r["h"],
        )
    def node_data(self, item: dict) -> dict | None:
        """Detail copy for an item, if it belongs to a documented node.

        Every part of a node carries the copy — card, label and icon alike — so
        clicking anywhere on it opens the detail panel. The demo URL rides in
        `customData.cdf.href` rather than the native `link` field, because
        Excalidraw paints a link badge on every linked element and a board this
        dense drowns in them.
        """
        key = item.get("key")
        if not key or key not in self.details:
            return None
        info = self.details[key]
        data = {"key": key, **info}
        if "href" in info:
            data["href"] = absolute(info["href"])
        return data

    def backdrop_at(self, x: float, y: float) -> str:
        """Opaque color behind a point — needed to flatten translucent text."""
        for card in self.cards:
            if card["x"] <= x <= card["x"] + card["w"] and card["y"] <= y <= card["y"] + card["h"]:
                fill = opaque(card["fill"], CANVAS_BG)
                if fill != "transparent":
                    return fill
        return CANVAS_BG

    # ---------------------------------------------------------------- elements

    def add_rect(self, item: dict) -> None:
        step = step_for(item)
        if "platform-container" in item["classes"]:
            # Gradient stroke and fill — emitted as one SVG image instead.
            self.add_frame(item, step)
            return
        is_connector = any("connector" in c for c in item["classes"])
        fill = opaque(item.get("fill"), CANVAS_BG)
        stroke = opaque(item.get("stroke"), CANVAS_BG)
        # The portal draws connectors as thin filled bars with no outline.
        if is_connector:
            stroke = fill

        cdf = self.node_data(item)
        data: dict = {}
        if step:
            data["build"] = {"step": step}
        if cdf:
            data["cdf"] = cdf

        self.elements.append(
            {
                **base_el(),
                "id": nid(),
                "x": item["x"],
                "y": item["y"],
                "width": item["w"],
                "height": item["h"],
                "strokeColor": stroke,
                "backgroundColor": fill,
                "strokeWidth": item.get("strokeWidth") or 1,
                "strokeStyle": "dashed" if item.get("dash") else "solid",
                # Excalidraw's adaptive radius honors an explicit value, which
                # lets the portal's own rx values come through exactly.
                "roundness": {"type": 3, "value": item["rx"]} if item["rx"] else None,
                **({"customData": data} if data else {}),
            }
        )

    def add_text(self, item: dict) -> None:
        text = item["text"].upper() if item.get("transform") == "uppercase" else item["text"]
        fs = font_size_for(item)
        width = text_width(text, fs)

        # SVG anchors text on its glyph baseline, Excalidraw on the box's top
        # edge. Excalidraw draws line 0 at `lineHeightPx - (height - baseline)`
        # from the top with an alphabetic text baseline, so keeping `height` at
        # the exact line height makes that offset equal `baseline` — and the
        # glyph then lands precisely on the portal's baseline.
        lines = max(1, len(text.split("\n")))
        line_px = fs * LINE_HEIGHT
        height = lines * line_px
        baseline = line_px * 0.75
        top = item["baseline"] - baseline
        left = item["x"] - width / 2 if item["anchor"] == "middle" else item["x"]
        step = step_for(item)
        cdf = self.node_data(item)
        data: dict = {}
        if step:
            data["build"] = {"step": step}
        if cdf:
            data["cdf"] = cdf

        self.elements.append(
            {
                **base_el(type="text"),
                "id": nid(),
                "x": left,
                "y": top,
                "width": width,
                "height": height,
                "baseline": baseline,
                "strokeColor": opaque(item.get("fill"), self.backdrop_at(item["x"], item["baseline"])),
                "backgroundColor": "transparent",
                "text": text,
                "originalText": text,
                "fontSize": fs,
                "fontFamily": FONT_FAMILY,
                "textAlign": "center" if item["anchor"] == "middle" else "left",
                "verticalAlign": "top",
                "containerId": None,
                "lineHeight": LINE_HEIGHT,
                "roundness": None,
                **({"customData": data} if data else {}),
            }
        )

    def add_frame(self, item: dict, step: int) -> None:
        self.elements.append(
            {
                **base_el(type="image"),
                "id": nid(),
                "x": item["x"],
                "y": item["y"],
                "width": item["w"],
                "height": item["h"],
                "strokeColor": "transparent",
                "backgroundColor": "transparent",
                "fileId": cdf_assets.GRADIENT_FRAME_ID,
                "scale": [1, 1],
                "status": "saved",
                "roundness": None,
                **({"customData": {"build": {"step": step}}} if step else {}),
            }
        )

    def add_image(self, item: dict) -> None:
        step = step_for(item)
        size = item.get("size")
        self.elements.append(
            {
                **base_el(type="image"),
                "id": nid(),
                "x": item["x"],
                "y": item["y"],
                "width": size or item["w"],
                "height": size or item["h"],
                "strokeColor": "transparent",
                "backgroundColor": "transparent",
                "fileId": cdf_assets.file_id_for(item),
                "scale": [1, 1],
                "status": "saved",
                "roundness": None,
                **({"customData": {"build": {"step": step}}} if step else {}),
            }
        )

    def add_credit(self) -> None:
        """Attribution line below the diagram, naming the portal it came from.

        Plain text on purpose. A native Excalidraw `link` would make the line
        clickable, but Excalidraw paints its link badge onto the canvas where
        no stylesheet can reach it, and that white box is distracting on a
        projected board. The URL is spelled out instead. Step 0 keeps the line
        on screen throughout the build.
        """
        text = f"Source: {PORTAL_BASE}cisco-data-fabric.html"
        fs = 14
        line_px = fs * LINE_HEIGHT
        bottom = max(
            i.get("y", i.get("baseline", 0)) + i.get("h", 0) for i in self.spec["items"]
        )
        self.elements.append(
            {
                **base_el(type="text"),
                "id": nid(),
                "x": self.spec["viewBox"][0] + CREDIT_INSET,
                "y": bottom + CREDIT_GAP,
                "width": text_width(text, fs),
                "height": line_px,
                "baseline": line_px * 0.75,
                "strokeColor": CREDIT_COLOR,
                "backgroundColor": "transparent",
                "text": text,
                "originalText": text,
                "fontSize": fs,
                "fontFamily": FONT_FAMILY,
                "textAlign": "left",
                "verticalAlign": "top",
                "containerId": None,
                "lineHeight": LINE_HEIGHT,
                "roundness": None,
            }
        )

    def build(self) -> list[dict]:
        # Painting order: frame, then connectors beneath the cards they join,
        # then cards, then their artwork and labels on top.
        order = {"rect": 0, "icon": 1, "sourceIcon": 1, "image": 1, "text": 2}
        for item in sorted(self.spec["items"], key=lambda i: order[i["kind"]]):
            if item["kind"] == "rect":
                self.add_rect(item)
            elif item["kind"] == "text":
                self.add_text(item)
            else:
                self.add_image(item)
        self.add_credit()
        return self.elements


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--upload", action="store_true", help="create the board on local Splunk")
    ap.add_argument("--update", metavar="BOARD_ID", help="overwrite an existing local board")
    args = ap.parse_args()

    spec = json.load(open(SPEC_PATH))
    elements = Builder(spec).build()
    files = cdf_assets.load_files()

    used = {e["fileId"] for e in elements if e["type"] == "image"}
    missing = used - {f["id"] for f in files}
    if missing:
        raise SystemExit(f"missing artwork for: {sorted(missing)} — run scripts/cdf_assets.py")

    bundle = {
        "format": "whiteboard-bundle",
        "formatVersion": 1,
        "whiteboardApp": "0.3.36",
        "exportedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "name": BOARD_NAME,
        "board": {
            "elements": elements,
            "appState": {
                "viewBackgroundColor": CANVAS_BG,
                "theme": "light",
                "gridSize": None,
                "objectsSnapModeEnabled": True,
                "isBindingEnabled": True,
            },
            "files": [f for f in files if f["id"] in used],
        },
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump(bundle, f, indent=2)

    steps = {}
    for e in elements:
        s = (e.get("customData") or {}).get("build", {}).get("step", 0)
        steps[s] = steps.get(s, 0) + 1
    print(f"Wrote {os.path.relpath(OUT_PATH, ROOT)}")
    print(f"  {len(elements)} elements, {len(bundle['board']['files'])} files")
    print(f"  links: {sum(1 for e in elements if e.get('link'))}")
    print("  build steps: " + ", ".join(f"{k}:{steps[k]}" for k in sorted(steps)))

    if args.upload or args.update:
        import cdf_upload

        if args.update:
            cdf_upload.update_board(args.update, BOARD_NAME, bundle)
            key = args.update
        else:
            key = cdf_upload.create_board(BOARD_NAME, bundle)
        print(f"  board id: {key}")
        print(f"  URL: http://127.0.0.1:8000/en-US/app/whiteboard_app/whiteboard?id={key}")


if __name__ == "__main__":
    main()
