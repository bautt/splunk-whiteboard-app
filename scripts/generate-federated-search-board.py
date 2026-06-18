#!/usr/bin/env python3
"""Generate 'Expanding visibility with Federated Search' whiteboard (Data Chaos style)."""

from __future__ import annotations

import json
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

BOARD_NAME = "Expanding visibility with Federated Search"

PRODUCTS = [
    ("Splunk\nEnterprise", "mktg-Datacenter-000000"),
    ("Splunk Cloud", "mktg-Cloud-000000"),
    ("Splunk O11y\nCloud", "mktg-Cloud Services Monitoring-000000"),
]

USE_CASES = [
    "Threat Hunting",
    "Compliance",
    "Detection",
    "Exploration",
    "Investigation",
    "Historical Analysis",
]

# (label, icon file id, orange label like slide)
SOURCES = [
    ("Splunk", "mktg-Analyze-f97316", True),
    ("Amazon S3", "mktg-Blank-Database-000000", False),
    ("Amazon\nSecurity Lake", "mktg-Data-Management-000000", False),
    ("Splunk Machine\nData Lake*", "mktg-Cloud-f97316", True),
    ("Azure Data\nLakes*", "mktg-Databases-000000", False),
    ("Snowflake*", "mktg-Blank-Database-000000", False),
    ("Splunk DDSS*", "mktg-Advanced-Search-f97316", True),
    ("Amazon\nCloudWatch\nLake**", "mktg-Cloud-000000", False),
]


def chip(x, y, w, h, label, step=None):
    chunk, _ = rect(
        x, y, w, h,
        C["monitor"], C["monitor_fill"], sw=1.5, step=step,
        label=label, fs=11,
    )
    return chunk


def source_box(x, y, w, h, label, icon_fid, orange=False, step=None):
    els = []
    els.append(image(x + w / 2 - 20, y + 8, 40, icon_fid, step=step))
    color = C["orange"] if orange else C["ink"]
    chunk, rid = rect(x, y, w, h, C["border"], C["white"], sw=2, step=step)
    els.extend(chunk)
    lines = label.split("\n")
    th = max(18, len(lines) * 14)
    ty = y + h - th - 8
    els.append(
        text_block(x + 4, ty, w - 8, label, fs=10, color=color, step=step, align="center")
    )
    return els


def build_elements() -> list[dict]:
    els: list[dict] = []
    ox, ow = 60, 1080
    label_w = 110
    row_x = ox + label_w + 10

    # ── Title ───────────────────────────────────────────────────────────
    els.append(text_block(ox, 36, ow, "Expanding visibility with Federated Search", fs=28, step=1))

    # ── Splunk products (consumers) ─────────────────────────────────────
    prod_y = 96
    prod_w, prod_h, prod_gap = 220, 96, 24
    prod_total = 3 * prod_w + 2 * prod_gap
    prod_start = ox + (ow - prod_total) / 2
    els.append(text_block(ox, prod_y + 28, label_w, "Platforms", fs=18, align="left", step=2))
    for i, (label, fid) in enumerate(PRODUCTS):
        x = prod_start + i * (prod_w + prod_gap)
        els.extend(icon_box(x, prod_y, prod_w, prod_h, label, fid, step=2, icon_size=44))

    # ── Federated Search container ──────────────────────────────────────
    fab_x, fab_y, fab_w, fab_h = ox, 218, ow, 248
    els.extend(gradient_border(fab_x, fab_y, fab_w, fab_h, thickness=5, step=3))
    chunk, _ = rect(
        fab_x + 5, fab_y + 5, fab_w - 10, fab_h - 10,
        C["neutral"], C["main_fill"], sw=1, step=3,
    )
    els.extend(chunk)

    inner_x = fab_x + 20
    inner_w = fab_w - 40
    band_h = 48
    band_chunk, _ = rect(
        inner_x, fab_y + 18, inner_w, band_h,
        C["orange"], C["orange"], sw=0, step=4,
    )
    els.extend(band_chunk)
    els.append(
        text_block(inner_x, fab_y + 18, inner_w, "Federated Search", fs=22, color="#FFFFFF", step=4)
    )

    # ── Use cases ───────────────────────────────────────────────────────
    uc_y = fab_y + 82
    uc_h = 52
    uc_gap = 10
    uc_w = (inner_w - uc_gap * (len(USE_CASES) - 1)) / len(USE_CASES)
    for i, label in enumerate(USE_CASES):
        x = inner_x + i * (uc_w + uc_gap)
        els.extend(chip(x, uc_y, uc_w, uc_h, label, step=5))

    els.append(
        text_block(
            inner_x, fab_y + 148, inner_w,
            "Break Down Silos with Federated Access",
            fs=14, color=C["neutral"], step=6,
        )
    )

    # Divider line (visual separator before sources)
    line_chunk, _ = rect(inner_x, fab_y + 178, inner_w, 2, C["border"], C["border"], sw=0, step=6)
    els.extend(line_chunk)

    # ── Data sources ─────────────────────────────────────────────────────
    src_y = 500
    src_w, src_h, src_gap = 118, 100, 12
    els.append(text_block(ox, src_y + 30, label_w, "Data sources", fs=18, align="left", step=7))
    for i, (label, fid, orange) in enumerate(SOURCES):
        x = row_x + i * (src_w + src_gap)
        els.extend(source_box(x, src_y, src_w, src_h, label, fid, orange=orange, step=7))

    els.append(
        text_block(
            ox + label_w + 10, src_y + src_h + 12, ow - label_w - 10,
            "JSON, Parquet, Iceberg, Delta Lake",
            fs=12, color=C["neutral"], step=8,
        )
    )

    # ── Footer ──────────────────────────────────────────────────────────
    els.append(
        text_block(ox, 640, 280, "© 2025 SPLUNK LLC\n© 2024 SPLUNK INC.", fs=10, color=C["neutral"], align="left", step=9)
    )
    els.append(
        text_block(ox + ow - 320, 640, 320, "*Under development now\n**Roadmap", fs=10, color=C["neutral"], align="right", step=9)
    )

    # ── Flow arrows (bottom → top) ───────────────────────────────────────
    mid = ox + ow / 2
    gap1 = src_y - (fab_y + fab_h)
    if gap1 > 8:
        els.append(arrow_v(mid, fab_y + fab_h, gap1, C["analyze"], dashed=True, both=True, step=10))
    gap2 = fab_y - (prod_y + prod_h)
    if gap2 > 8:
        els.append(arrow_v(mid, prod_y + prod_h, gap2, C["analyze"], dashed=True, both=True, step=11))

    return els


def main() -> None:
    b = bundle(BOARD_NAME, build_elements())
    b["whiteboardApp"] = "0.3.47"
    out = os.path.join(
        os.path.dirname(__file__),
        "..",
        "assets",
        "generated",
        "Federated_Search_Visibility.whiteboard.json",
    )
    downloads = os.path.expanduser(
        "~/Downloads/Expanding_visibility_with_Federated_Search.whiteboard.json"
    )
    save_and_upload(b, out, tags="federated-search,splunk,architecture")
    with open(downloads, "w") as f:
        json.dump(b, f, indent=2)
    print(f"Also wrote {downloads}")


if __name__ == "__main__":
    main()
