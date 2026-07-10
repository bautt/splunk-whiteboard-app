#!/usr/bin/env python3
"""Assign build/reveal steps to a whiteboard export.

Groups box + label + nearby icons, then orders steps bottom→top, left→right.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

CONTAINER_TYPES = {"rectangle", "ellipse", "diamond"}
STRUCT_MAX = 8  # thin rules / frame bars


def bbox(el: dict) -> tuple[float, float, float, float]:
    w = float(el.get("width") or 0)
    h = float(el.get("height") or 0)
    return float(el["x"]), float(el["y"]), float(el["x"]) + w, float(el["y"]) + h


def overlaps(a: tuple[float, float, float, float], b: tuple[float, float, float, float], pad: float = 0) -> bool:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    return (ax1 - pad) < bx2 and (ax2 + pad) > bx1 and (ay1 - pad) < by2 and (ay2 + pad) > by1


def center(el: dict) -> tuple[float, float]:
    x1, y1, x2, y2 = bbox(el)
    return (x1 + x2) / 2, (y1 + y2) / 2


def is_structural(el: dict) -> bool:
    if el["type"] != "rectangle":
        return False
    w = float(el.get("width") or 0)
    h = float(el.get("height") or 0)
    return w <= STRUCT_MAX or h <= STRUCT_MAX


def is_base_layer(el: dict) -> bool:
    """Always-visible chrome: main title and edge frame bars."""
    if el.get("isDeleted"):
        return False
    if el["type"] == "text":
        text = (el.get("text") or "").strip()
        if text.startswith("From data chaos"):
            return True
    if el["type"] == "image":
        fid = el.get("fileId") or ""
        if "splunk-transition" in fid:
            return True
    if is_structural(el):
        x1, y1, x2, y2 = bbox(el)
        w, h = x2 - x1, y2 - y1
        # Vertical side rails
        if w <= STRUCT_MAX and h >= 80:
            return True
    return False


class UnionFind:
    def __init__(self) -> None:
        self.parent: dict[str, str] = {}

    def find(self, x: str) -> str:
        self.parent.setdefault(x, x)
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a: str, b: str) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[rb] = ra


def initial_bucket_key(el: dict, by_id: dict[str, dict]) -> str:
    if el.get("groupIds"):
        return f"grp:{el['groupIds'][0]}"
    if el.get("containerId"):
        return f"box:{el['containerId']}"
    if el["type"] in CONTAINER_TYPES:
        has_label = any(b.get("type") == "text" for b in el.get("boundElements") or [])
        has_bound_text = any(
            o.get("type") == "text" and o.get("containerId") == el["id"] for o in by_id.values()
        )
        if has_label or has_bound_text:
            return f"box:{el['id']}"
    if is_structural(el):
        _, y1, _, y2 = bbox(el)
        h = y2 - y1
        if h <= STRUCT_MAX:
            return f"rule:{round(y1)}"
    return f"solo:{el['id']}"


def assign_reveal_steps(elements: list[dict]) -> list[dict]:
    live = [e for e in elements if e and not e.get("isDeleted")]
    by_id = {e["id"]: e for e in live}

    uf = UnionFind()
    id_to_key: dict[str, str] = {}
    for el in live:
        key = initial_bucket_key(el, by_id)
        id_to_key[el["id"]] = key
        uf.find(key)

    # Merge structural rule segments on the same Y.
    rule_keys: dict[int, list[str]] = {}
    for el in live:
        if not is_structural(el):
            continue
        _, y1, _, y2 = bbox(el)
        if (y2 - y1) <= STRUCT_MAX:
            rule_keys.setdefault(round(y1), []).append(id_to_key[el["id"]])
    for keys in rule_keys.values():
        root = keys[0]
        for k in keys[1:]:
            uf.union(root, k)

    rects = [e for e in live if e["type"] in CONTAINER_TYPES and not is_structural(e)]
    content_rects = [r for r in rects if (bbox(r)[3] - bbox(r)[1]) > STRUCT_MAX]

    # Attach images to the nearest overlapping content box in the same column.
    for el in live:
        if el["id"] not in id_to_key:
            continue
        if el["type"] == "image":
            ecx, ecy = center(el)
            best: str | None = None
            best_dist = float("inf")
            for r in content_rects:
                rx1, ry1, rx2, ry2 = bbox(r)
                if not overlaps(bbox(el), (rx1, ry1, rx2, ry2), pad=8):
                    continue
                rcx = (rx1 + rx2) / 2
                dist = abs(ecx - rcx) + abs(ecy - ry1) * 0.2
                if dist < best_dist:
                    best_dist = dist
                    best = id_to_key[r["id"]]
            if best:
                uf.union(id_to_key[el["id"]], best)

    # Attach orphan section labels to the nearest content tile (same column / row).
    orphan_texts = [
        e
        for e in live
        if e["type"] == "text"
        and not e.get("containerId")
        and not is_base_layer(e)
    ]
    for el in orphan_texts:
        tcx, tcy = center(el)
        tw = float(el.get("width") or 0)
        # Wide/centered band titles get their own reveal step.
        if tw > 220:
            continue
        # Left-margin row labels (Sources, Workloads) attach to the leftmost tile in that row.
        if tcx < 120:
            nearest_row = min(content_rects, key=lambda o: abs(center(o)[1] - tcy))
            row_y = center(nearest_row)[1]
            row_rects = [o for o in content_rects if abs(center(o)[1] - row_y) < 60]
            if row_rects:
                anchor = min(row_rects, key=lambda o: o["x"])
                uf.union(id_to_key[el["id"]], id_to_key[anchor["id"]])
            continue
        best: dict | None = None
        best_score = float("inf")
        _, _ty1, _, ty2 = bbox(el)
        for r in content_rects:
            rcx, rcy = center(r)
            rx1, ry1, rx2, _ = bbox(r)
            if ty2 < ry1:
                continue
            col_penalty = 0 if rx1 - 50 <= tcx <= rx2 + 50 else abs(tcx - rcx) + 80
            if abs(rcy - tcy) > 80:
                continue
            score = abs(rcy - tcy) * 1.5 + col_penalty
            if score < best_score:
                best_score = score
                best = r
        if best is not None and best_score < 220:
            uf.union(id_to_key[el["id"]], id_to_key[best["id"]])

    # Bucket aggregates for sorting.
    buckets: dict[str, dict] = {}
    for el in live:
        if is_base_layer(el):
            continue
        root = uf.find(id_to_key[el["id"]])
        if root not in buckets:
            buckets[root] = {
                "ids": [],
                "minX": float("inf"),
                "minY": float("inf"),
                "maxX": float("-inf"),
                "maxY": float("-inf"),
            }
        b = buckets[root]
        b["ids"].append(el["id"])
        x1, y1, x2, y2 = bbox(el)
        b["minX"] = min(b["minX"], x1)
        b["minY"] = min(b["minY"], y1)
        b["maxX"] = max(b["maxX"], x2)
        b["maxY"] = max(b["maxY"], y2)

    ordered = sorted(buckets.values(), key=lambda b: (-b["maxY"], b["minX"]))

    step_by_id: dict[str, int] = {}
    for idx, b in enumerate(ordered, start=1):
        for eid in b["ids"]:
            step_by_id[eid] = idx

    out: list[dict] = []
    for el in elements:
        if not el or el.get("isDeleted"):
            out.append(el)
            continue
        custom = dict(el.get("customData") or {})
        custom.pop("build", None)
        if is_base_layer(el):
            if custom:
                el = {**el, "customData": custom}
            else:
                el = {**el, "customData": {}}
            out.append(el)
            continue
        step = step_by_id.get(el["id"])
        if step:
            custom["build"] = {"step": step}
        el = {
            **el,
            "customData": custom,
            "version": (el.get("version") or 1) + 1,
        }
        out.append(el)
    return out


def describe_steps(elements: list[dict]) -> None:
    live = [e for e in elements if e and not e.get("isDeleted")]
    steps: dict[int, list[str]] = {}
    for el in live:
        step = (el.get("customData") or {}).get("build", {}).get("step", 0)
        label = el.get("text", el["type"]) if el["type"] == "text" else el["type"]
        if isinstance(label, str) and len(label) > 40:
            label = label[:37] + "..."
        steps.setdefault(step, []).append(f"{el['type']}:{label}")
    for step in sorted(steps):
        items = steps[step]
        print(f"  step {step:2d} ({len(items)} els): {', '.join(items[:4])}{'…' if len(items)>4 else ''}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("-o", "--output", type=Path)
    parser.add_argument("--describe", action="store_true")
    args = parser.parse_args()

    data = json.loads(args.input.read_text())
    board = data.get("board") or data
    elements = board.get("elements") or data.get("elements") or []
    updated = assign_reveal_steps(elements)

    if "board" in data:
        data["board"]["elements"] = updated
    else:
        data["elements"] = updated

    out_path = args.output or args.input
    out_path.write_text(json.dumps(data, indent=2) + "\n")
    print(f"Wrote {out_path}")
    if args.describe:
        print("Reveal order:")
        describe_steps(updated)
    return 0


if __name__ == "__main__":
    sys.exit(main())
