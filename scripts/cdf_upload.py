#!/usr/bin/env python3
"""Create a whiteboard in the local Splunk KV store.

Targets the Splunk on this machine (`/opt/splunk`, REST on 127.0.0.1:8089) rather
than the remote lab that `wbgen_common` talks to.

Credentials come from the macOS Keychain item `splunk_local_admin` and are read
in-process only — never printed, logged, or written to disk. The local instance
serves REST over a self-signed certificate, so verification is disabled for this
loopback connection only.
"""

from __future__ import annotations

import base64
import json
import ssl
import subprocess
import time
import urllib.request

HOST = "https://127.0.0.1:8089"
APP = "whiteboard_app"
COLLECTION = "whiteboards"
KEYCHAIN_SERVICE = "splunk_local_admin"
KEYCHAIN_ACCOUNT = "admin"


def _auth_header() -> str:
    """Basic auth header built from the Keychain entry, kept in memory only."""
    password = subprocess.run(
        ["security", "find-generic-password", "-a", KEYCHAIN_ACCOUNT, "-s", KEYCHAIN_SERVICE, "-w"],
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()
    token = base64.b64encode(f"{KEYCHAIN_ACCOUNT}:{password}".encode()).decode()
    return f"Basic {token}"


def _context() -> ssl.SSLContext:
    # Local Splunk ships a self-signed cert; this client only ever talks to
    # 127.0.0.1, so there is no transport to intercept.
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def _request(path: str, payload: dict) -> dict:
    url = f"{HOST}/servicesNS/nobody/{APP}/{path}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        method="POST",
        headers={"Authorization": _auth_header(), "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, context=_context()) as res:
        body = res.read()
    return json.loads(body) if body else {}


def _board_payload(name: str, bundle: dict, **extra) -> dict:
    board = bundle["board"]
    return {
        "name": name,
        "updated_at": int(time.time() * 1000),
        "elements_json": json.dumps(
            {
                "elements": board["elements"],
                "appState": board["appState"],
                "files": board["files"],
            }
        ),
        **extra,
    }


def create_board(name: str, bundle: dict, owner: str = "admin", tags: str = "cisco,data-fabric") -> str:
    body = _request(
        f"storage/collections/data/{COLLECTION}?output_mode=json",
        _board_payload(name, bundle, owner=owner, tags=tags),
    )
    return body.get("_key", str(body))


def update_board(board_id: str, name: str, bundle: dict) -> None:
    _request(
        f"storage/collections/data/{COLLECTION}/{board_id}?output_mode=json",
        _board_payload(name, bundle),
    )
