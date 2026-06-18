#!/usr/bin/env python3
"""Generate Cisco Data Fabric architecture whiteboard (reference style)."""

from __future__ import annotations

import json
import os
import random
import string
import time
import urllib.request

HOST = "https://v37823.1blu.de:8089"
APP = "whiteboard_app"
BOARD_NAME = "Cisco Data Fabric"

C = {
    "ink": "#1B1B1B",
    "neutral": "#5C5C5C",
    "border": "#C3CBD4",
    "monitor": "#1E93C6",
    "monitor_fill": "#E8F4FC",
    "monitor_band": "#D4EDF7",
    "analyze": "#65A637",
    "orange": "#ED8B00",
    "orange_fill": "#FFFCF5",
    "orange_band": "#FFF4D6",
    "pink": "#EC4899",
    "main_fill": "#FAFBFC",
    "white": "#FFFFFF",
}

# Gradient segments for Cisco Data Fabric bar
GRADIENT = ["#F97316", "#FB923C", "#F472B6", "#EC4899", "#DB2777"]

TOP_APPS = [
    ("Security", "mktg-Attacker-General-000000"),
    ("Observability", "mktg-Cloud Services Monitoring-000000"),
    ("Splunk & Cisco AI\nAssistants & Agents", "mktg-Collaboration-000000"),
    ("3rd Party AI Apps\n(ChatGPT, Claude, …)", "mktg-Applications-000000"),
]

ICON_IDS = {
    "Indexes": "mktg-Blank-Database-f97316",
    "Splunk Machine\nData Lake": "mktg-Cloud-f97316",
    "3rd Party\nData Lakes": "mktg-Databases-f97316",
}


def nid(size: int = 16) -> str:
    alphabet = string.ascii_letters + string.digits + "-_"
    return "".join(random.choice(alphabet) for _ in range(size))


def base_el(**kw) -> dict:
    now = int(time.time() * 1000)
    el = {
        "type": "rectangle",
        "version": 1,
        "versionNonce": random.randint(0, 10**9),
        "isDeleted": False,
        "fillStyle": "solid",
        "strokeWidth": 1.5,
        "strokeStyle": "solid",
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "seed": random.randint(0, 10**9),
        "groupIds": [],
        "frameId": None,
        "roundness": {"type": 3},
        "boundElements": [],
        "updated": now,
        "link": None,
        "locked": False,
    }
    el.update(kw)
    return el


def rect(x, y, w, h, stroke, bg, sw=1.5, step=None, label=None, fs=16, label_y_offset=0):
    rid = nid()
    elements = []
    bound = []
    if label:
        tid = nid()
        lines = label.split("\n")
        th = max(20, len(lines) * int(fs * 1.25))
        ty = y + h / 2 - th / 2 + label_y_offset
        bound = [{"type": "text", "id": tid}]
        elements.append(
            {
                **base_el(type="text"),
                "id": tid,
                "x": x + 8,
                "y": ty,
                "width": w - 16,
                "height": th,
                "strokeColor": C["ink"],
                "backgroundColor": "transparent",
                "text": label,
                "fontSize": fs,
                "fontFamily": 2,
                "textAlign": "center",
                "verticalAlign": "middle",
                "containerId": rid,
                "originalText": label,
                "lineHeight": 1.25,
                "roundness": None,
            }
        )
    custom = {"build": {"step": step}} if step else None
    elements.insert(
        0,
        {
            **base_el(),
            "id": rid,
            "x": x,
            "y": y,
            "width": w,
            "height": h,
            "strokeColor": stroke,
            "backgroundColor": bg,
            "strokeWidth": sw,
            "boundElements": bound,
            **({"customData": custom} if custom else {}),
        },
    )
    return elements, rid


def image(x, y, size, file_id, step=None):
    custom = {"build": {"step": step}} if step else None
    return {
        **base_el(type="image"),
        "id": nid(),
        "x": x,
        "y": y,
        "width": size,
        "height": size,
        "strokeColor": "transparent",
        "backgroundColor": "transparent",
        "fileId": file_id,
        "scale": [1, 1],
        "status": "saved",
        "roundness": None,
        **({"customData": custom} if custom else {}),
    }


def arrow_v(x, y, length, color, dashed=False, both=False, step=None):
    custom = {"build": {"step": step}} if step else None
    return {
        **base_el(type="arrow"),
        "id": nid(),
        "x": x,
        "y": y,
        "width": 0,
        "height": length,
        "strokeColor": color,
        "backgroundColor": "transparent",
        "strokeWidth": 2,
        "strokeStyle": "dashed" if dashed else "solid",
        "points": [[0, length], [0, 0]],
        "startArrowhead": "arrow" if both else None,
        "endArrowhead": "arrow",
        "roundness": {"type": 2},
        **({"customData": custom} if custom else {}),
    }


def build_elements() -> list[dict]:
    els: list[dict] = []
    ox, ow = 60, 960

    # ── Top application row ─────────────────────────────────────────────
    box_w, box_h, gap = 210, 96, 20
    top_y = 48
    for i, (label, icon_fid) in enumerate(TOP_APPS):
        x = ox + i * (box_w + gap)
        icon_size = 52
        els.append(image(x + box_w / 2 - icon_size / 2, top_y + 8, icon_size, icon_fid, step=1))
        chunk, _ = rect(
            x, top_y + icon_size + 4, box_w, box_h - icon_size - 4,
            C["border"], C["white"], sw=2, step=1,
            label=label, fs=14 if "\n" in label else 16,
        )
        els.extend(chunk)

    # ── MCP Server ────────────────────────────────────────────────────
    mcp_y = 168
    chunk, mcp_id = rect(ox, mcp_y, ow, 40, C["orange"], C["orange_fill"], sw=2, step=2, label="MCP Server", fs=18)
    els.extend(chunk)

    # ── Cisco Data Fabric gradient bar ────────────────────────────────
    bar_y, bar_h = 228, 52
    seg_w = ow / len(GRADIENT)
    for i, color in enumerate(GRADIENT):
        chunk, _ = rect(ox + i * seg_w, bar_y, seg_w, bar_h, color, color, sw=1, step=3)
        els.extend(chunk)
    # Title overlay on gradient
    tid = nid()
    title = "Splunk Platform's Evolution: Cisco Data Fabric"
    els.append({
        **base_el(type="text"),
        "id": tid,
        "x": ox + 20,
        "y": bar_y + 12,
        "width": ow - 40,
        "height": 28,
        "strokeColor": "#FFFFFF",
        "backgroundColor": "transparent",
        "text": title,
        "fontSize": 22,
        "fontFamily": 2,
        "textAlign": "center",
        "verticalAlign": "middle",
        "originalText": title,
        "lineHeight": 1.25,
        "roundness": None,
        "customData": {"build": {"step": 3}},
    })

    # ── AI-Powered Analytics ──────────────────────────────────────────
    ana_y = 300
    chunk, ana_id = rect(
        ox, ana_y, ow, 52, C["monitor"], C["monitor_fill"], sw=2, step=4,
        label="AI-Powered Analytics", fs=20,
    )
    els.extend(chunk)

    # ── Data storage layer ────────────────────────────────────────────
    store_y, store_h = 380, 190
    inner_w = 520
    chunk, internal_id = rect(
        ox, store_y, inner_w, store_h, C["neutral"], C["main_fill"], sw=2, step=5,
        label="Internal Data Sources", fs=16, label_y_offset=-store_h / 2 + 18,
    )
    els.extend(chunk)

    idx_w = (inner_w - 40) / 2
    chunk, _ = rect(ox + 20, store_y + 36, idx_w, store_h - 56, C["monitor"], "#FFFFFF", sw=1.5, step=6, label="Indexes", fs=16)
    els.extend(chunk)
    els.append(image(ox + 20 + idx_w / 2 - 36, store_y + 52, 72, ICON_IDS["Indexes"], step=6))

    lake_x = ox + 20 + idx_w + 20
    chunk, _ = rect(lake_x, store_y + 36, idx_w, store_h - 56, C["analyze"], "#FFFFFF", sw=1.5, step=7, label="Splunk Machine\nData Lake", fs=15)
    els.extend(chunk)
    els.append(image(lake_x + idx_w / 2 - 36, store_y + 52, 72, ICON_IDS["Splunk Machine\nData Lake"], step=7))

    ext_x = ox + inner_w + 24
    ext_w = ow - inner_w - 24
    chunk, ext_id = rect(
        ext_x, store_y, ext_w, store_h, C["neutral"], C["main_fill"], sw=2, step=8,
        label="External Data Sources\n& 3rd Party", fs=15, label_y_offset=-store_h / 2 + 22,
    )
    els.extend(chunk)
    chunk, _ = rect(ext_x + 20, store_y + 50, ext_w - 40, store_h - 80, C["border"], "#FFFFFF", sw=1.5, step=8, label="3rd Party\nData Lakes", fs=16)
    els.extend(chunk)
    els.append(image(ext_x + ext_w / 2 - 36, store_y + 62, 72, ICON_IDS["3rd Party\nData Lakes"], step=8))

    # ── AI-Powered Data Management ────────────────────────────────────
    mgmt_y = 600
    chunk, mgmt_id = rect(
        ox, mgmt_y, ow, 72, C["monitor"], C["monitor_band"], sw=2, step=9,
        label="AI-Powered Data Management", fs=20, label_y_offset=-8,
    )
    els.extend(chunk)
    sub = "In-stream filtering, aggregations, & routing"
    els.append({
        **base_el(type="text"),
        "id": nid(),
        "x": ox + 20,
        "y": mgmt_y + 42,
        "width": ow - 40,
        "height": 22,
        "strokeColor": C["neutral"],
        "backgroundColor": "transparent",
        "text": sub,
        "fontSize": 14,
        "fontFamily": 2,
        "textAlign": "center",
        "verticalAlign": "middle",
        "originalText": sub,
        "lineHeight": 1.25,
        "roundness": None,
        "customData": {"build": {"step": 9}},
    })

    # ── Connectors (dashed arrows) ────────────────────────────────────
    mid_x = ox + ow / 2
    # Green bi-directional stack (top → fabric)
    for y0, y1, step in [
        (top_y + box_h + 4, mcp_y, 10),
        (mcp_y + 40, bar_y, 11),
        (bar_y + bar_h, ana_y, 12),
        (ana_y + 52, store_y, 13),
    ]:
        els.append(arrow_v(mid_x, y0, y1 - y0, C["analyze"], dashed=True, both=True, step=step))

    # Blue upward arrows (mgmt → storage)
    for ax, step in [(ox + inner_w * 0.25, 14), (ox + inner_w * 0.75, 14), (ext_x + ext_w / 2, 15)]:
        els.append(arrow_v(ax, store_y + store_h, mgmt_y - (store_y + store_h), C["monitor"], dashed=True, step=step))

    return els


def build_bundle() -> dict:
    elements = build_elements()
    return {
        "format": "whiteboard-bundle",
        "formatVersion": 1,
        "whiteboardApp": "0.3.36",
        "exportedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "name": BOARD_NAME,
        "board": {
            "elements": elements,
            "appState": {
                "viewBackgroundColor": "#ffffff",
                "theme": "dark",
                "gridSize": None,
                "objectsSnapModeEnabled": True,
                "isBindingEnabled": True,
            },
            "files": [],
        },
    }


def token() -> str:
    path = os.path.expanduser("~/.cursor/mcp.json")
    with open(path) as f:
        return json.load(f)["mcpServers"]["splunk-mcp-server"]["env"]["SPLUNK_TOKEN"]


def create_board(bundle: dict) -> str:
    board = bundle["board"]
    payload = {
        "name": BOARD_NAME,
        "tags": "cisco,data-fabric,architecture",
        "owner": "tbaublys",
        "updated_at": int(time.time() * 1000),
        "elements_json": json.dumps(
            {
                "elements": board["elements"],
                "appState": board["appState"],
                "files": board["files"],
            }
        ),
    }
    url = f"{HOST}/servicesNS/nobody/{APP}/storage/collections/data/whiteboards?output_mode=json"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        method="POST",
        headers={
            "Authorization": f"Bearer {token()}",
            "Content-Type": "application/json",
        },
    )
    ctx = __import__("ssl")._create_unverified_context()
    with urllib.request.urlopen(req, context=ctx) as res:
        body = json.loads(res.read())
    # Splunk returns inserted key
    if isinstance(body, dict):
        return body.get("_key") or body.get("key") or str(body)
    return str(body)


def main() -> None:
    bundle = build_bundle()
    out = os.path.join(
        os.path.dirname(__file__), "..", "assets", "generated", "Cisco_Data_Fabric.whiteboard.json"
    )
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as f:
        json.dump(bundle, f, indent=2)
    print(f"Wrote {out}")
    print(f"Elements: {len(bundle['board']['elements'])}")

    try:
        key = create_board(bundle)
        print(f"Board ID: {key}")
        print(f"URL: https://v37823.1blu.de/en-US/app/whiteboard_app/whiteboard?id={key}")
    except Exception as e:
        print(f"KV upload failed ({e}) — import the JSON file manually via Export panel.")


if __name__ == "__main__":
    main()
