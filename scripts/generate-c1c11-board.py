#!/usr/bin/env python3
"""Generate Splunk SVA C1/C11 — Distributed Clustered Deployment (Single Site, no SHC)."""

from __future__ import annotations

import json
import os
import subprocess

from wbgen_common import (
    C,
    LINE_HEIGHT,
    bundle,
    fit_text,
    fit_text_centered,
    image,
    nid,
    rect,
    save_and_upload,
    text_metrics,
)

BOARD_NAME = "SVA C1/C11 — Distributed Clustered (Single Site)"
DOC_URL = (
    "https://help.splunk.com/en/splunk-cloud-platform/splunk-validated-architectures/"
    "splunk-platform-indexing-and-search/distributed-clustered-deployment---single-site-c1--c11"
)

PURPLE = "#9762D0"
PURPLE_FILL = "#F8F4FC"
GREEN = "#65A637"
GREEN_FILL = "#EAF4E4"
ORANGE = "#ED8B00"

SHAPE_SPECS = {
    "uf": ("uf", "65a637"),
    "hf": ("hf", "f7912c"),
    "indexer": ("indexer", "65a637"),
    "sh": ("sh", "9762d0"),
    "cm": ("cm", "5c5c5c"),
    "ds": ("ds", "5c5c5c"),
    "lm": ("lm", "5c5c5c"),
    "mc": ("mc", "5c5c5c"),
    "hec": ("hec", "1e93c6"),
    "syslog": ("syslog", "5c5c5c"),
    "server": ("server", "1b1b1b"),
    "site": ("server", "5c5c5c"),
}


def shape_fid(key: str) -> str:
    shape_id, color = SHAPE_SPECS[key]
    return f"shape-{shape_id}-{color}"


def export_shape_files() -> list[dict]:
    unique = sorted({SHAPE_SPECS[k] for k in SHAPE_SPECS})
    script = os.path.join(os.path.dirname(__file__), "export-shape-files.cjs")
    src_dir = os.path.join(os.path.dirname(__file__), "..", "src")
    proc = subprocess.run(
        ["node", script, json.dumps(unique)],
        cwd=src_dir,
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(proc.stdout)


def arrow_h(x, y, length, color, dashed=False, step=None):
    return {
        "type": "arrow",
        "version": 1,
        "versionNonce": 0,
        "isDeleted": False,
        "id": nid(),
        "fillStyle": "solid",
        "strokeWidth": 2,
        "strokeStyle": "dashed" if dashed else "solid",
        "roughness": 0,
        "opacity": 100,
        "angle": 0,
        "x": x,
        "y": y,
        "width": length,
        "height": 0,
        "strokeColor": color,
        "backgroundColor": "transparent",
        "seed": 0,
        "groupIds": [],
        "frameId": None,
        "roundness": {"type": 2},
        "boundElements": [],
        "updated": 0,
        "link": None,
        "locked": False,
        "points": [[0, 0], [length, 0]],
        "startArrowhead": None,
        "endArrowhead": "arrow",
        **({"customData": {"build": {"step": step}}} if step else {}),
    }


def tier_band(x, y, w, label, stroke, fill, fs=20, step=None):
    chunk, _ = rect(x, y, w, 44, stroke, fill, sw=1.5, step=step, label=label, fs=fs)
    return chunk


def linked_text(x, y, text, fs, url, step=None, color=None, align="left", valign="top"):
    el = fit_text(x, y, text, fs=fs, color=color, step=step, align=align, valign=valign)
    el["link"] = url
    return el


def icon_card(x, y, w, h, label, file_id, step=None, icon_size=52, fs=16):
    els = []
    border, _ = rect(x, y, w, h, C["border"], C["white"], sw=1.5, step=step)
    els.extend(border)
    icon_x = x + w / 2 - icon_size / 2
    icon_y = y + 12
    els.append(image(icon_x, icon_y, icon_size, file_id, step=step))
    label_h, _ = text_metrics(label, fs, LINE_HEIGHT)
    label_y = y + h - label_h - 10
    els.append(fit_text_centered(x + w / 2, label_y, label, fs=fs, color=C["ink"], step=step))
    return els


def note_box(x, y, w, h, title, bullets, stroke, fill, step=None):
    els = []
    border, _ = rect(x, y, w, h, stroke, fill, sw=2, step=step)
    els.extend(border)
    els.append(fit_text(x + 12, y + 12, title, fs=17, color=stroke, step=step, align="left", valign="top"))
    body = "\n".join(f"• {b}" for b in bullets)
    els.append(fit_text(x + 12, y + 38, body, fs=16, color=C["ink"], step=step, align="left", valign="top"))
    return els


def build_elements() -> list[dict]:
    els: list[dict] = []
    ox, oy = 40, 25
    cw = 1140
    card_h = 112
    card_gap = 16
    tier_gap = 10
    tier_band_h = 44

    title = "Distributed Clustered Deployment — Single Site"
    subtitle = "Splunk Validated Architecture · click title for documentation"

    els.append(linked_text(ox, oy, title, fs=33, url=DOC_URL, step=1))
    badge, _ = rect(ox + cw - 180, oy + 4, 78, 34, C["monitor"], C["monitor_fill"], step=1, label="C1", fs=18)
    els.extend(badge)
    badge2, _ = rect(ox + cw - 92, oy + 4, 82, 34, PURPLE, PURPLE_FILL, step=1, label="C11", fs=18)
    els.extend(badge2)
    els.append(linked_text(ox, oy + 42, subtitle, fs=16, url=DOC_URL, step=1, color=C["neutral"]))

    site_y = oy + 78
    site_h = 640
    site_chunk, _ = rect(ox, site_y, cw, site_h, C["neutral"], C["main_fill"], sw=2, step=2)
    els.extend(site_chunk)
    els.append(image(ox + 18, site_y + 10, 40, shape_fid("site"), step=2))
    els.append(fit_text(ox + 64, site_y + 14, "Single Site", fs=21, color=C["neutral"], step=2, align="left", valign="top"))

    inner_x = ox + 196
    inner_w = cw - 216

    # ── Management (no SHC Deployer) ─────────────────────────────────────
    mgmt_x = ox + 16
    mgmt_y = site_y + 52
    mgmt_w = 168
    mgmt_h = 460
    mgmt_chunk, _ = rect(mgmt_x, mgmt_y, mgmt_w, mgmt_h, C["border"], C["white"], sw=1.5, step=3)
    els.extend(mgmt_chunk)
    els.append(fit_text_centered(mgmt_x + mgmt_w / 2, mgmt_y + 12, "Management", fs=18, color=C["neutral"], step=3, valign="top"))

    mgmt_items = [
        ("Cluster\nManager", "cm"),
        ("Deployment\nServer", "ds"),
        ("License\nManager", "lm"),
        ("Monitoring\nConsole", "mc"),
    ]
    mgmt_card_h = 96
    for i, (label, key) in enumerate(mgmt_items):
        y = mgmt_y + 42 + i * (mgmt_card_h + 12)
        els.extend(icon_card(mgmt_x + 10, y, mgmt_w - 20, mgmt_card_h, label, shape_fid(key), step=3 + i, icon_size=42, fs=16))

    # ── Search tier — standalone search heads (no SHC / no LB) ───────────
    search_y = site_y + 60
    els.extend(
        tier_band(inner_x, search_y, inner_w, "Search Tier — Standalone Search Heads", PURPLE, PURPLE_FILL, fs=20, step=8)
    )

    row_y = search_y + tier_band_h + tier_gap
    users_w = 132
    sh_w = 148
    sh_gap = 18
    row_start = inner_x + 16

    els.extend(icon_card(row_start, row_y, users_w, card_h, "Users", shape_fid("server"), step=9, icon_size=48, fs=16))

    sh_start = row_start + users_w + 48
    for i in range(3):
        x = sh_start + i * (sh_w + sh_gap)
        els.extend(icon_card(x, row_y, sh_w, card_h, f"Search Head {i + 1}", shape_fid("sh"), step=10 + i, icon_size=48, fs=16))

    els.append(arrow_h(row_start + users_w + 6, row_y + card_h / 2, sh_start - row_start - users_w - 12, PURPLE, step=10))
    els.append(
        fit_text(
            inner_x + 16,
            row_y + card_h + 8,
            "Independent search heads · no Search Head Cluster",
            fs=14,
            color=PURPLE,
            step=11,
            align="left",
            valign="top",
        )
    )

    # ── Indexing tier ────────────────────────────────────────────────────
    idx_y = row_y + card_h + 36
    els.extend(
        tier_band(inner_x, idx_y, inner_w, "Indexing Tier — Indexer Cluster", GREEN, GREEN_FILL, fs=20, step=15)
    )

    idx_box_y = idx_y + tier_band_h + tier_gap
    idx_box_h = 136
    idx_chunk, _ = rect(inner_x + 16, idx_box_y, inner_w - 32, idx_box_h, GREEN, GREEN_FILL, sw=2, step=16)
    els.extend(idx_chunk)
    els.append(
        fit_text(
            inner_x + 26,
            idx_box_y + 12,
            "Cluster peers · replication & search factor enforced by Cluster Manager",
            fs=15,
            color=GREEN,
            step=16,
            align="left",
            valign="top",
        )
    )

    peer_w = 124
    peer_gap = 18
    peer_total = 3 * peer_w + 2 * peer_gap
    peer_start = inner_x + 16 + (inner_w - 32 - peer_total) / 2
    peer_y = idx_box_y + 44
    peer_h = 86
    for i in range(3):
        x = peer_start + i * (peer_w + peer_gap)
        els.extend(
            icon_card(x, peer_y, peer_w, peer_h, f"Indexer {i + 1}", shape_fid("indexer"), step=17 + i, icon_size=42, fs=16)
        )

    # ── Data collection ──────────────────────────────────────────────────
    dc_y = idx_box_y + idx_box_h + 22
    els.extend(tier_band(inner_x, dc_y, inner_w, "Data Collection", C["monitor"], C["monitor_fill"], fs=18, step=20))

    dc_row_y = dc_y + tier_band_h + tier_gap
    sources = [
        ("Universal\nForwarder", "uf"),
        ("Heavy\nForwarder", "hf"),
        ("HEC / API", "hec"),
        ("Syslog", "syslog"),
    ]
    src_w = 136
    src_gap = 16
    src_total = len(sources) * src_w + (len(sources) - 1) * src_gap
    src_start = inner_x + (inner_w - src_total) / 2
    for i, (label, key) in enumerate(sources):
        x = src_start + i * (src_w + src_gap)
        els.extend(icon_card(x, dc_row_y, src_w, card_h, label, shape_fid(key), step=21 + i, icon_size=44, fs=16))

    els.append(
        fit_text(
            inner_x + 16,
            dc_row_y + card_h + 12,
            "Forwarders discover indexers via Cluster Manager · optimal event distribution",
            fs=14,
            color=C["neutral"],
            step=25,
            align="left",
            valign="top",
        )
    )

    # ── Side notes (from SVA C1/C11 documentation) ───────────────────────
    note_x = ox + cw + 20
    els.extend(
        note_box(
            note_x,
            site_y,
            220,
            148,
            "Benefits",
            [
                "Multiple independent search heads",
                "Forwarders discover indexers via CM",
                "HA data via indexer replication",
            ],
            GREEN,
            GREEN_FILL,
            step=26,
        )
    )
    els.extend(
        note_box(
            note_x,
            site_y + 164,
            220,
            168,
            "Limitations",
            [
                "No search tier HA",
                "No automatic site-level DR",
                "Cluster size & replication limits",
                "Nondeterministic replication",
            ],
            ORANGE,
            C["orange_fill"],
            step=27,
        )
    )
    els.extend(
        note_box(
            note_x,
            site_y + 348,
            220,
            132,
            "C11 (Enterprise Security)",
            [
                "ES on standalone search heads",
                "Plan capacity per Splunk PS guidance",
            ],
            PURPLE,
            PURPLE_FILL,
            step=28,
        )
    )
    els.append(
        linked_text(
            note_x,
            site_y + 494,
            "View Splunk documentation →",
            fs=15,
            url=DOC_URL,
            step=29,
            color=C["monitor"],
        )
    )

    els.append(
        arrow_h(mgmt_x + mgmt_w + 4, mgmt_y + 60, inner_x - mgmt_x - mgmt_w - 12, C["neutral"], dashed=True, step=4)
    )

    els.append(
        fit_text(
            ox,
            site_y + site_h + 20,
            "Splunk Validated Architectures · Category C1 (general) / C11 (Enterprise Security)",
            fs=16,
            color=C["neutral"],
            step=30,
            align="left",
            valign="top",
        )
    )

    return els


def main() -> None:
    elements = build_elements()
    files = export_shape_files()
    b = bundle(BOARD_NAME, elements)
    b["whiteboardApp"] = "0.3.66"
    b["board"]["appState"] = {
        "viewBackgroundColor": "#ffffff",
        "displayBackgroundColor": "#ffffff",
        "theme": "light",
        "gridSize": None,
        "objectsSnapModeEnabled": True,
        "isBindingEnabled": True,
    }
    b["board"]["files"] = files

    out = os.path.join(
        os.path.dirname(__file__),
        "..",
        "assets",
        "generated",
        "SVA_C1C11_Single_Site.whiteboard.json",
    )
    board_id = save_and_upload(b, out, tags="sva,c1,c11,template")
    downloads = os.path.expanduser("~/Downloads/SVA_C1C11_Single_Site.whiteboard.json")
    with open(downloads, "w") as f:
        json.dump(b, f, indent=2)
    print(f"Also wrote {downloads}")
    if board_id:
        print(f"Done — board {board_id}")


if __name__ == "__main__":
    main()
