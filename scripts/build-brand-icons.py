#!/usr/bin/env python3
"""Regenerate src/web/lib/brandIcons.js from assets/brand-icons/."""

import base64
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "assets" / "brand-icons"
OUT = ROOT / "src/web/lib/brandIcons.js"

ENTRIES = [
    ("brand-splunk-transition-black", "Splunk, a Cisco company (black)", "splunk-transition-black.png"),
    ("brand-splunk-transition-white", "Splunk, a Cisco company (white)", "splunk-transition-white.png"),
    ("brand-splunk-mark", "Splunk mark", "splunk-mark.png"),
    ("brand-cisco", "Cisco", "cisco-color.png"),
    ("brand-opentelemetry", "OpenTelemetry", "opentelemetry-color.png"),
    ("brand-kubernetes", "Kubernetes", "kubernetes-color.png"),
]


def png_to_svg(path: pathlib.Path) -> str:
    raw = path.read_bytes()
    data = base64.b64encode(raw).decode("ascii")
    w = int.from_bytes(raw[16:20], "big")
    h = int.from_bytes(raw[20:24], "big")
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        f'preserveAspectRatio="xMidYMid meet">'
        f'<image width="{w}" height="{h}" href="data:image/png;base64,{data}"/></svg>'
    )


def main() -> None:
    icons = []
    for icon_id, label, fname in ENTRIES:
        path = ICON_DIR / fname
        if not path.exists():
            raise SystemExit(f"Missing {path}")
        icons.append(
            {
                "id": icon_id,
                "label": label,
                "tintable": False,
                "svg": png_to_svg(path),
            }
        )

    lines = [
        "/** Brand / vendor logos for the Shapes panel. Regenerate: python3 scripts/build-brand-icons.py */",
        "export const BRAND_ICONS = [",
    ]
    for icon in icons:
        lines.append(
            "  {"
            f" id: {json.dumps(icon['id'])},"
            f" label: {json.dumps(icon['label'])},"
            f" tintable: {str(icon['tintable']).lower()},"
            f" svg: {json.dumps(icon['svg'])}"
            " },"
        )
    lines.extend(["];", "", "export default BRAND_ICONS;", ""])
    OUT.write_text("\n".join(lines))
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes, {len(icons)} icons)")


if __name__ == "__main__":
    main()
