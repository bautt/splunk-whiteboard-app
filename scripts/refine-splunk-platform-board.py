#!/usr/bin/env python3
"""One-shot layout + color pass for the Splunk Platform architecture board."""

from __future__ import annotations

import json
import os
import random
import sys
import time
import urllib.request

BOARD_ID = "6a3177d8c94c2457ad0a64c9"
HOST = "https://v37823.1blu.de:8089"
APP = "whiteboard_app"

# Splunk-aligned palette
C = {
    "ink": "#1B1B1B",
    "neutral": "#5C5C5C",
    "border": "#C3CBD4",
    "investigate": "#DC4E41",
    "monitor": "#1E93C6",
    "analyze": "#65A637",
    "act": "#9762D0",
    "traces": "#ED8B00",
    "main_fill": "#FAFBFC",
}

PILLARS = [
    {"accent": C["investigate"], "header": "#F5D0CC", "panel": "#FEF6F5"},
    {"accent": C["monitor"], "header": "#C8E4F4", "panel": "#F3F9FD"},
    {"accent": C["analyze"], "header": "#CFE6C3", "panel": "#F4FAF1"},
    {"accent": C["act"], "header": "#D9CCEE", "panel": "#F8F4FC"},
]

DATA_TYPES = [
    ("RFnj5U0BxmV3NdAWHEEAp", "Events", C["investigate"]),
    ("3BAh7cYZF0x-KTMN5ae01", "Logs", C["analyze"]),
    ("BPHpLSdjdFpSUhOXnO-uI", "Metrics", C["monitor"]),
    ("7oXhlAsoBIUhu6xEb5pC-", "Traces", C["traces"]),
]

PILLAR_IDS = [
  {"outline": "HBwcLZDIqKymeXLn", "chip": "64N-W2hPM2LG1FYep5lD_", "title": "INVESTIGATE",
   "subtitle": "SCHEMA\nON READ", "image": "So7KJ6ZFkSwFBAyv"},
  {"outline": "WYwDLIbYLN19Qqab", "chip": "G_c8-TPbwIgjkaZQOoWPn", "title": "MONITOR",
   "subtitle": "Realtime", "image": "cyi1FlFvOnwjOIgi"},
  {"outline": "d3ChLytN1HAdKjFk", "chip": "1AdEYLPvSrcv6lflLw1q0", "title": "ANALYZE",
   "subtitle": "Correlate", "image": "omMOyMfqoIAr24sG"},
  {"outline": "W3nzSicQoZtyESVh", "chip": "7S0u79b2G_YnfBNcSSqUO", "title": "ACT",
   "subtitle": "Automate", "image": "eh1F6TkI60QFFE5p"},
]

STAKEHOLDERS = [
    ("aAfluOWOYursf6ID", "AFHT-Uinz16Jo3ijwCxXN", "SOC"),
    ("V6KIhRU28hEN6RL0", "nhY2NBVSrQzBOM9sNM-0B", "NOC"),
    ("nhEjjNiXlchAC0wk", "PXsQgr2eFyWfvvZNlyt2x", "Business"),
    ("i8CNkIICPcPWbVCe", "Ucvrq27L82EXZge4BX7Gm", "C-Level"),
]

CHIP_IDS = [
    ("TEoubZCC14fBqssq", "syslog"),
    ("h8oQ1M3EuO56sEpf", "metrics"),
    ("ANwoQXjOeUQjcMni", "logs"),
    ("h0SE4hDC5aY8mDUV", "cloud"),
    ("JRYMkgLmweekVnWU", "database"),
    ("goI6tFBfeh4jsLqj", "API"),
    ("e4rtlJgJa72QonE7", "mobile"),
    ("E1xMnW1ZSQnDJHRa", "IoT"),
]

MAIN = dict(x=200, y=220, w=860, h=470)
PAD = 20
INNER_W = MAIN["w"] - 2 * PAD
COL_W = 188
COL_GAP = 12
COL_X = [MAIN["x"] + PAD + i * (COL_W + COL_GAP) for i in range(4)]


def token() -> str:
    path = os.path.expanduser("~/.cursor/mcp.json")
    with open(path) as f:
        return json.load(f)["mcpServers"]["splunk-mcp-server"]["env"]["SPLUNK_TOKEN"]


def fetch_board() -> dict:
    url = (
        f"{HOST}/servicesNS/nobody/{APP}/storage/collections/data/"
        f"whiteboards/{BOARD_ID}?output_mode=json"
    )
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token()}"})
    with urllib.request.urlopen(req, context=__import__("ssl")._create_unverified_context()) as res:
        return json.loads(res.read())


def save_board(doc: dict) -> None:
    payload = {
        "name": doc["name"],
        "tags": doc.get("tags", ""),
        "owner": doc.get("owner", "tbaublys"),
        "updated_at": int(time.time() * 1000),
        "elements_json": doc["elements_json"],
    }
    url = (
        f"{HOST}/servicesNS/nobody/{APP}/storage/collections/data/"
        f"whiteboards/{BOARD_ID}?output_mode=json"
    )
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {token()}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, context=__import__("ssl")._create_unverified_context()) as res:
        res.read()


def touch(el: dict) -> None:
    el["version"] = int(el.get("version", 1)) + 1
    el["versionNonce"] = random.randint(0, 10**9)
    el["updated"] = int(time.time() * 1000)


def set_rect(el: dict, x, y, w, h, **style) -> None:
    el["x"], el["y"], el["width"], el["height"] = x, y, w, h
    for k, v in style.items():
        el[k] = v
    touch(el)


def center_text(el: dict, cx: float, cy: float, **style) -> None:
    w = el.get("width", 80)
    h = el.get("height", 20)
    el["x"] = cx - w / 2
    el["y"] = cy - h / 2
    el["textAlign"] = "center"
    for k, v in style.items():
        el[k] = v
    touch(el)


def center_image(el: dict, cx: float, cy: float, size: float = 96) -> None:
    el["x"] = cx - size / 2
    el["y"] = cy - size / 2
    el["width"] = size
    el["height"] = size
    touch(el)


def find_text(elements: list, text: str) -> dict | None:
    for el in elements:
        if el.get("type") == "text" and el.get("text") == text and not el.get("isDeleted"):
            return el
    return None


def refine(elements: list) -> int:
    by_id = {e["id"]: e for e in elements}
    changes = 0

    def bump(el):
        nonlocal changes
        changes += 1

    # Main container
    main = by_id.get("fcIisiWFpKyAT8wv")
    if main:
        set_rect(main, MAIN["x"], MAIN["y"], MAIN["w"], MAIN["h"],
                 strokeColor=C["neutral"], backgroundColor=C["main_fill"],
                 strokeWidth=2, roughness=0)
        bump(main)

    # Splunk Apps header bar + title
    header = by_id.get("zFSQPlxp89Bztg7EsJryx")
    hx, hy, hw, hh = MAIN["x"] + PAD, MAIN["y"] + 14, INNER_W, 48
    if header:
        set_rect(header, hx, hy, hw, hh,
                 backgroundColor="#D4EDF7", strokeColor=C["monitor"], strokeWidth=2, roughness=0)
        bump(header)
    title = find_text(elements, "Splunk Apps ") or find_text(elements, "Splunk Apps")
    if title:
        center_text(title, hx + hw / 2, hy + hh / 2,
                    fontSize=28, strokeColor=C["ink"], fontFamily=2)
        if title.get("text", "").endswith(" "):
            title["text"] = "Splunk Apps"
            title["originalText"] = "Splunk Apps"
        bump(title)

    # Sticky notes
    initiatives_box = by_id.get("SEOhis4izcr73Nd-gSV9U")
    outcomes_box = by_id.get("1fTEIoJq4m2HIWS_lJzFC")
    sx, sw, sh = 10, 218, 168
    if initiatives_box:
        set_rect(initiatives_box, sx, 198, sw, sh,
                 backgroundColor="#E8F4FC", strokeColor=C["monitor"], strokeWidth=2, roughness=0)
        bump(initiatives_box)
    if outcomes_box:
        set_rect(outcomes_box, sx, 382, sw, sh,
                 backgroundColor="#EAF4E4", strokeColor=C["analyze"], strokeWidth=2, roughness=0)
        bump(outcomes_box)

    init_text = by_id.get("Ex8-e__pfKlyMVThlnxCc")
    if init_text:
        init_text["text"] = (
            "Initiatives:\n"
            "Remove finger-pointing\n"
            "Increase uptime\n"
            "Fewer incidents\n"
            "Increase margin"
        )
        init_text["originalText"] = init_text["text"]
        init_text["x"] = sx + 14
        init_text["y"] = 214
        init_text["width"] = sw - 28
        init_text["fontSize"] = 15
        init_text["strokeColor"] = C["monitor"]
        init_text["textAlign"] = "left"
        touch(init_text)
        bump(init_text)

    out_text = by_id.get("NbqTYz5JcP0AUuFdQvqUN")
    if out_text:
        out_text["text"] = (
            "Outcomes:\n"
            "Increase efficiency\n"
            "Reduce repetitive work\n"
            "Reduce MTTR\n"
            "Increase resilience\n"
            "End-to-end visibility"
        )
        out_text["originalText"] = out_text["text"]
        out_text["x"] = sx + 14
        out_text["y"] = 398
        out_text["width"] = sw - 28
        out_text["fontSize"] = 15
        out_text["strokeColor"] = C["analyze"]
        out_text["textAlign"] = "left"
        touch(out_text)
        bump(out_text)

    # Pillars
    py, ph = MAIN["y"] + 78, 238
    for i, spec in enumerate(PILLAR_IDS):
        theme = PILLARS[i]
        cx = COL_X[i] + COL_W / 2
        px = COL_X[i]

        outline = by_id.get(spec["outline"])
        if outline:
            set_rect(outline, px, py, COL_W, ph,
                     backgroundColor="transparent", strokeColor=theme["accent"],
                     strokeWidth=2, roughness=0)
            bump(outline)

        chip = by_id.get(spec["chip"])
        chip_w, chip_h = 140, 32
        if chip:
            set_rect(chip, px + (COL_W - chip_w) / 2, py + 8, chip_w, chip_h,
                     backgroundColor=theme["header"], strokeColor=theme["accent"],
                     strokeWidth=1.5, roughness=0)
            bump(chip)

        title_el = find_text(elements, spec["title"])
        if title_el:
            center_text(title_el, cx, py + 24,
                        fontSize=14, strokeColor=C["ink"], fontFamily=2)
            bump(title_el)

        sub_el = find_text(elements, spec["subtitle"])
        if sub_el:
            center_text(sub_el, cx, py + 58,
                        fontSize=18, strokeColor=theme["accent"], fontFamily=2)
            bump(sub_el)

        img = by_id.get(spec["image"])
        if img:
            center_image(img, cx, py + 155, 92)
            bump(img)

    # Stakeholders — evenly across main width
    slot_w = INNER_W / 4
    for i, (img_id, label_id, label) in enumerate(STAKEHOLDERS):
        cx = MAIN["x"] + PAD + slot_w * (i + 0.5)
        img = by_id.get(img_id)
        if img:
            center_image(img, cx, 52, 88)
            bump(img)
        lbl = by_id.get(label_id)
        if lbl:
            center_text(lbl, cx, 128, fontSize=18, strokeColor=C["ink"], fontFamily=2)
            bump(lbl)

    # OT / IT near SOC column
    ot = by_id.get("Po94wCJveNmXSk7mB2mZN")
    it = by_id.get("Tr4Zox9hmZ5ByAkuiXHkN")
    soc_cx = MAIN["x"] + PAD + slot_w * 0.5
    if ot:
        set_rect(ot, soc_cx - 58, 18, 52, 28,
                 backgroundColor="#EAF4E4", strokeColor=C["analyze"], roughness=0)
        bump(ot)
    if it:
        set_rect(it, soc_cx + 6, 18, 52, 28,
                 backgroundColor="#FDECEA", strokeColor=C["investigate"], roughness=0)
        bump(it)
    ot_t = find_text(elements, "OT")
    it_t = find_text(elements, "IT")
    if ot_t:
        center_text(ot_t, soc_cx - 32, 32, fontSize=14, strokeColor=C["analyze"])
        bump(ot_t)
    if it_t:
        center_text(it_t, soc_cx + 32, 32, fontSize=14, strokeColor=C["investigate"])
        bump(it_t)

    # Universal data platform
    udp = by_id.get("sTRqkrjkkWq_3-D6EU0iT")
    uy = MAIN["y"] + MAIN["h"] - 128
    if udp:
        set_rect(udp, MAIN["x"] + PAD, uy, INNER_W, 22,
                 backgroundColor="#FFF4D6", strokeColor=C["traces"], strokeWidth=1.5, roughness=0)
        bump(udp)
    udp_t = find_text(elements, "Universal Data Platform")
    if udp_t:
        center_text(udp_t, MAIN["x"] + PAD + INNER_W / 2, uy + 11,
                    fontSize=15, strokeColor=C["ink"], fontFamily=2)
        bump(udp_t)

    # Data type boxes
    box_w = (INNER_W - 3 * 10) / 4
    box_y = uy + 30
    for i, (box_id, label, accent) in enumerate(DATA_TYPES):
        bx = MAIN["x"] + PAD + i * (box_w + 10)
        box = by_id.get(box_id)
        if box:
            set_rect(box, bx, box_y, box_w, 36,
                     backgroundColor="#FFFCF5", strokeColor=accent, strokeWidth=2, roughness=0)
            bump(box)
        lbl = find_text(elements, label)
        if lbl:
            center_text(lbl, bx + box_w / 2, box_y + 18,
                        fontSize=15, strokeColor=accent, fontFamily=2)
            bump(lbl)

    # Machine data bar
    machine = by_id.get("JagyuyrqY3qAuayw")
    my = box_y + 48
    if machine:
        set_rect(machine, MAIN["x"] + PAD, my, INNER_W, 34,
                 backgroundColor="#EEF0F2", strokeColor=C["neutral"],
                 strokeWidth=1.5, roughness=0, fillStyle="solid")
        bump(machine)
    md_t = find_text(elements, "Machine Data")
    if md_t:
        center_text(md_t, MAIN["x"] + PAD + INNER_W / 2, my + 17,
                    fontSize=14, strokeColor=C["ink"], fontFamily=2)
        bump(md_t)

    # Source chips
    chip_gap = 8
    chip_w = (INNER_W - chip_gap * (len(CHIP_IDS) - 1)) / len(CHIP_IDS)
    chip_y = my + 42
    for i, (chip_id, label) in enumerate(CHIP_IDS):
        bx = MAIN["x"] + PAD + i * (chip_w + chip_gap)
        chip = by_id.get(chip_id)
        if chip:
            set_rect(chip, bx, chip_y, chip_w, 30,
                     backgroundColor="#FFFFFF", strokeColor=C["border"], strokeWidth=1, roughness=0)
            bump(chip)
        lbl = find_text(elements, label)
        if lbl:
            center_text(lbl, bx + chip_w / 2, chip_y + 15,
                        fontSize=11, strokeColor=C["ink"], fontFamily=2)
            bump(lbl)

    # Arrows — neutral gray-green, bindings preserved; Excalidraw will re-route on load
    for arrow in elements:
        if arrow.get("type") == "arrow" and not arrow.get("isDeleted"):
            arrow["strokeColor"] = C["analyze"]
            arrow["strokeWidth"] = 2
            arrow["roughness"] = 0
            touch(arrow)
            bump(arrow)

    return changes


def main() -> int:
    doc = fetch_board()
    scene = json.loads(doc["elements_json"])
    elements = scene.get("elements", [])
    n = refine(elements)
    scene["elements"] = elements
    doc["elements_json"] = json.dumps(scene)
    save_board(doc)
    print(f"Refined board {BOARD_ID}: {n} element updates applied.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
