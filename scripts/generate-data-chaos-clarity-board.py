#!/usr/bin/env python3
"""Generate 'From data chaos to AI driven clarity' whiteboard (Cisco Data Fabric style)."""

from __future__ import annotations

import os

from wbgen_common import (
    C,
    arrow_v,
    bundle,
    gradient_border,
    icon_box,
    image,
    rect,
    save_and_upload,
    text_block,
)

BOARD_NAME = "Data chaos to AI clarity"

WORKLOADS = [
    ("Security", "mktg-Attacker-General-000000"),
    ("Observability", "mktg-Cloud Services Monitoring-000000"),
    ("Network Ops", "mktg-Adaptive-Response-000000"),
    ("Custom\nApplications", "mktg-Custom-Applications-000000"),
]

FABRIC_FEATURES = [
    ("AI-powered\ndata management", "mktg-Automation-f97316"),
    ("Federated Search\nand Analytics", "mktg-Advanced-Search-f97316"),
    ("AI-Native Experiences\nand Platform for AI", "mktg-Analyze-f97316"),
]

SOURCES = [
    ("Infrastructure", "mktg-Active-Directory-000000"),
    ("Applications", "mktg-Applications-000000"),
    ("Security", "mktg-Alert-000000"),
    ("Users &\nDevices", "mktg-Cell-Phone-Devices-000000"),
]


def build_elements() -> list[dict]:
    els: list[dict] = []
    ox, ow = 60, 960
    label_w = 110
    row_x = ox + label_w + 10
    box_w, box_h, gap = 190, 92, 18

    # ── Title ───────────────────────────────────────────────────────────
    els.append(text_block(ox, 36, ow, "From data chaos to AI driven clarity", fs=28, step=1))

    # ── Workloads ───────────────────────────────────────────────────────
    wl_y = 100
    els.append(text_block(ox, wl_y + 24, label_w, "Workloads", fs=18, align="left", step=2))
    for i, (label, fid) in enumerate(WORKLOADS):
        x = row_x + i * (box_w + gap)
        els.extend(icon_box(x, wl_y, box_w, box_h, label, fid, step=2, icon_size=44))

    # ── Cisco Data Fabric container ─────────────────────────────────────
    fab_x, fab_y, fab_w, fab_h = ox, 210, ow, 300
    els.extend(gradient_border(fab_x, fab_y, fab_w, fab_h, thickness=5, step=3))
    chunk, _ = rect(
        fab_x + 5, fab_y + 5, fab_w - 10, fab_h - 10,
        C["neutral"], C["main_fill"], sw=1, step=3,
    )
    els.extend(chunk)
    els.append(text_block(fab_x, fab_y + 16, fab_w, "Cisco Data Fabric", fs=22, step=3))

    inner_x = fab_x + 24
    inner_w = fab_w - 48
    feat_y = fab_y + 56
    feat_h = 118
    feat_w = (inner_w - 32) / 3
    for i, (label, fid) in enumerate(FABRIC_FEATURES):
        x = inner_x + i * (feat_w + 16)
        els.append(image(x + feat_w / 2 - 32, feat_y + 8, 64, fid, step=4 + i))
        chunk, _ = rect(
            x, feat_y, feat_w, feat_h,
            C["border"], C["white"], sw=1.5, step=4 + i,
            label=label, fs=13,
        )
        els.extend(chunk)

    lake_y = feat_y + feat_h + 20
    lake_h = 88
    els.append(image(inner_x + inner_w / 2 - 36, lake_y + 8, 72, "mktg-Cloud-f97316", step=7))
    chunk, _ = rect(
        inner_x, lake_y, inner_w, lake_h,
        C["monitor"], C["monitor_fill"], sw=2, step=7,
        label="Machine Data Lake", fs=18,
    )
    els.extend(chunk)

    # ── Sources ─────────────────────────────────────────────────────────
    src_y = 548
    els.append(text_block(ox, src_y + 24, label_w, "Sources", fs=18, align="left", step=8))
    for i, (label, fid) in enumerate(SOURCES):
        x = row_x + i * (box_w + gap)
        els.extend(icon_box(x, src_y, box_w, box_h, label, fid, step=8, icon_size=44))

    # ── Footer ──────────────────────────────────────────────────────────
    els.append(text_block(ox, 680, 200, "© 2024 SPLUNK LLC", fs=11, color=C["neutral"], align="left", step=9))

    # ── Flow arrows (bottom → top) ────────────────────────────────────────
    mid = ox + ow / 2
    gap1 = src_y - (fab_y + fab_h)
    if gap1 > 8:
        els.append(arrow_v(mid, fab_y + fab_h, gap1, C["analyze"], dashed=True, both=True, step=10))
    gap2 = fab_y - (wl_y + box_h)
    if gap2 > 8:
        els.append(arrow_v(mid, wl_y + box_h, gap2, C["analyze"], dashed=True, both=True, step=11))

    return els


def main() -> None:
    b = bundle(BOARD_NAME, build_elements())
    out = os.path.join(
        os.path.dirname(__file__), "..", "assets", "generated", "Data_Chaos_to_AI_Clarity.whiteboard.json"
    )
    save_and_upload(b, out, tags="cisco,data-fabric,workloads,sources")


if __name__ == "__main__":
    main()
