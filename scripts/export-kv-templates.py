#!/usr/bin/env python3
"""Export whiteboard_templates from Splunk KV into assets/prebuilt-templates/."""

import json
import os
import pathlib
import ssl
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "prebuilt-templates"

# Map KV template name → (slug, display label, description)
EXPORT_MAP = {
    "Plattform WB Dark": (
        "plattform-wb-dark",
        "Splunk Platform (dark canvas)",
        "Splunk platform architecture on a dark canvas background.",
    ),
    "Data Fabric": (
        "data-fabric",
        "Cisco Data Fabric",
        "Cisco Data Fabric architecture overview.",
    ),
    "Data Fabric - MDL": (
        "data-fabric-mdl",
        "Cisco Data Fabric (MDL)",
        "Cisco Data Fabric with MDL layer detail.",
    ),
}


def fetch_templates(host: str, token: str) -> list:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    url = (
        f"https://{host}:8089/servicesNS/nobody/whiteboard_app/"
        "storage/collections/data/whiteboard_templates?output_mode=json"
    )
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, context=ctx) as resp:
        data = json.load(resp)
    if isinstance(data, list):
        return data
    return [e["content"] for e in data.get("entry", [])]


def main() -> None:
    token = os.environ.get("SPLUNK_TOKEN")
    if not token:
        mcp = pathlib.Path.home() / ".cursor" / "mcp.json"
        if mcp.exists():
            token = json.loads(mcp.read_text())["mcpServers"]["splunk-mcp-server"]["env"]["SPLUNK_TOKEN"]
    if not token:
        raise SystemExit("Set SPLUNK_TOKEN or configure ~/.cursor/mcp.json")

    host = os.environ.get("SPLUNK_HOST", "v37823.1blu.de")
    rows = fetch_templates(host, token)
    OUT.mkdir(parents=True, exist_ok=True)

    manifest = []
    for row in rows:
        kv_name = row.get("name", "")
        if kv_name not in EXPORT_MAP:
            continue
        slug, label, desc = EXPORT_MAP[kv_name]
        elements = json.loads(row.get("elements_json") or "[]")
        files = json.loads(row.get("files_json") or "[]")
        bundle = {
            "format": "whiteboard-bundle",
            "formatVersion": 1,
            "id": slug,
            "name": label,
            "description": desc,
            "board": {"elements": elements, "appState": {}, "files": files},
        }
        path = OUT / f"{slug}.whiteboard.json"
        path.write_text(json.dumps(bundle, separators=(",", ":")), encoding="utf-8")
        manifest.append(
            {"id": slug, "label": label, "description": desc, "file": path.name}
        )
        print(f"Wrote {path.name} ({path.stat().st_size} bytes, {len(elements)} elements)")

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Done — {len(manifest)} template(s) in {OUT}")


if __name__ == "__main__":
    main()
