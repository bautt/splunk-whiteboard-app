"""Shared helpers for whiteboard JSON generators."""

from __future__ import annotations

import json
import math
import os
import random
import string
import time
import urllib.request

HOST = "https://v37823.1blu.de:8089"
APP = "whiteboard_app"

LINE_HEIGHT = 1.25

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
    "main_fill": "#FAFBFC",
    "white": "#FFFFFF",
}

GRADIENT = ["#F97316", "#FB923C", "#F472B6", "#3B82F6", "#2563EB"]


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


def text_metrics(text: str, fs: int, lh: float = LINE_HEIGHT) -> tuple[int, int]:
    """Return (height, baseline) tuned to match Excalidraw canvas measurements."""
    lines = max(1, len((text or "").split("\n")))
    height = max(20, math.ceil(lines * fs * lh))
    baseline = math.ceil(fs * lh * max(lines - 0.25, 0.75))
    return height, baseline


def text_width(text: str, fs: int, pad: int = 12) -> int:
    """Estimate a tight Excalidraw text box width (fontFamily 2 / Nunito)."""
    longest = max(len(line) for line in (text or " ").split("\n"))
    return max(int(math.ceil(longest * fs * 0.47) + pad), int(fs * 1.5))


def text_el(
    x,
    y,
    w,
    text,
    fs=16,
    color=None,
    step=None,
    align="center",
    valign="middle",
    lh: float = LINE_HEIGHT,
    container_id=None,
):
    th, baseline = text_metrics(text, fs, lh)
    return {
        **base_el(type="text"),
        "id": nid(),
        "x": x,
        "y": y,
        "width": w,
        "height": th,
        "strokeColor": color or C["ink"],
        "backgroundColor": "transparent",
        "text": text,
        "fontSize": fs,
        "fontFamily": 2,
        "textAlign": align,
        "verticalAlign": valign,
        "containerId": container_id,
        "originalText": text,
        "lineHeight": lh,
        "baseline": baseline,
        "roundness": None,
        **({"customData": {"build": {"step": step}}} if step else {}),
    }


def rect(x, y, w, h, stroke, bg, sw=1.5, step=None, label=None, fs=16, label_y_offset=0):
    rid = nid()
    elements = []
    bound = []
    if label:
        tid = nid()
        tw = text_width(label, fs)
        th, _ = text_metrics(label, fs)
        tx = x + (w - tw) / 2
        ty = y + h / 2 - th / 2 + label_y_offset
        bound = [{"type": "text", "id": tid}]
        elements.append(
            {
                **text_el(
                    tx,
                    ty,
                    tw,
                    label,
                    fs=fs,
                    step=step,
                    container_id=rid,
                ),
                "id": tid,
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


def text_block(x, y, w, text, fs=16, color=None, step=None, align="center", valign="middle", lh: float = LINE_HEIGHT):
    return text_el(x, y, w, text, fs=fs, color=color, step=step, align=align, valign=valign, lh=lh)


def fit_text(x, y, text, fs=16, color=None, step=None, align="center", valign="middle", lh: float = LINE_HEIGHT):
    """Standalone text with a tight content-fit width."""
    tw = text_width(text, fs)
    if align == "center":
        pass  # x is already the left edge when pre-centered by caller
    elif align == "right":
        x = x - tw
    return text_el(x, y, tw, text, fs=fs, color=color, step=step, align=align, valign=valign, lh=lh)


def fit_text_centered(cx, y, text, fs=16, color=None, step=None, valign="middle", lh: float = LINE_HEIGHT):
    """Standalone text centered on cx."""
    tw = text_width(text, fs)
    return fit_text(cx - tw / 2, y, text, fs=fs, color=color, step=step, align="center", valign=valign, lh=lh)


def image(x, y, size, file_id, step=None):
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
        **({"customData": {"build": {"step": step}}} if step else {}),
    }


def arrow_v(x, y, length, color, dashed=False, both=False, step=None):
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
        "points": [[0, length], [0, 0]] if length > 0 else [[0, 0], [0, -length]],
        "startArrowhead": "arrow" if both else None,
        "endArrowhead": "arrow",
        "roundness": {"type": 2},
        **({"customData": {"build": {"step": step}}} if step else {}),
    }


def gradient_border(x, y, w, h, thickness=4, step=None):
    """Simulate gradient glow border with segmented strips."""
    els = []
    n = len(GRADIENT)
    seg_w = w / n
    for i, color in enumerate(GRADIENT):
        els.extend(rect(x + i * seg_w, y, seg_w, thickness, color, color, sw=1, step=step)[0])
    for i, color in enumerate(reversed(GRADIENT)):
        els.extend(rect(x + i * seg_w, y + h - thickness, seg_w, thickness, color, color, sw=1, step=step)[0])
    side_h = h - 2 * thickness
    for i, color in enumerate(GRADIENT[:3]):
        els.extend(rect(x, y + thickness + i * (side_h / 3), thickness, side_h / 3, color, color, sw=1, step=step)[0])
    for i, color in enumerate(GRADIENT[2:]):
        els.extend(
            rect(x + w - thickness, y + thickness + i * (side_h / 3), thickness, side_h / 3, color, color, sw=1, step=step)[0]
        )
    return els


def icon_box(x, y, w, h, label, icon_fid, step=None, icon_size=48):
    els = []
    els.append(image(x + w / 2 - icon_size / 2, y + 10, icon_size, icon_fid, step=step))
    chunk, _ = rect(x, y, w, h, C["border"], C["white"], sw=2, step=step, label=label, fs=14 if len(label) > 14 else 16, label_y_offset=h / 2 - 28)
    els.extend(chunk)
    return els


def bundle(name: str, elements: list[dict]) -> dict:
    return {
        "format": "whiteboard-bundle",
        "formatVersion": 1,
        "whiteboardApp": "0.3.36",
        "exportedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "name": name,
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


def update_board(board_id: str, bundle: dict) -> None:
    board = bundle["board"]
    payload = {
        "name": bundle["name"],
        "updated_at": int(time.time() * 1000),
        "elements_json": json.dumps(
            {"elements": board["elements"], "appState": board["appState"], "files": board["files"]}
        ),
    }
    url = (
        f"{HOST}/servicesNS/nobody/{APP}/storage/collections/data/whiteboards/"
        f"{board_id}?output_mode=json"
    )
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        method="POST",
        headers={"Authorization": f"Bearer {token()}", "Content-Type": "application/json"},
    )
    ctx = __import__("ssl")._create_unverified_context()
    with urllib.request.urlopen(req, context=ctx) as res:
        res.read()


def create_board(name: str, bundle: dict, tags: str = "") -> str:
    board = bundle["board"]
    payload = {
        "name": name,
        "tags": tags,
        "owner": "tbaublys",
        "updated_at": int(time.time() * 1000),
        "elements_json": json.dumps(
            {"elements": board["elements"], "appState": board["appState"], "files": board["files"]}
        ),
    }
    url = f"{HOST}/servicesNS/nobody/{APP}/storage/collections/data/whiteboards?output_mode=json"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        method="POST",
        headers={"Authorization": f"Bearer {token()}", "Content-Type": "application/json"},
    )
    ctx = __import__("ssl")._create_unverified_context()
    with urllib.request.urlopen(req, context=ctx) as res:
        body = json.loads(res.read())
    return body.get("_key", str(body))


def save_and_upload(bundle: dict, out_path: str, tags: str) -> str | None:
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(bundle, f, indent=2)
    print(f"Wrote {out_path} ({len(bundle['board']['elements'])} elements)")
    try:
        key = create_board(bundle["name"], bundle, tags)
        print(f"Board ID: {key}")
        print(f"URL: https://v37823.1blu.de/en-US/app/whiteboard_app/whiteboard?id={key}")
        return key
    except Exception as e:
        print(f"KV upload failed: {e}")
        return None
