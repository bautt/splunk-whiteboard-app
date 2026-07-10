# Developer guide — Splunk Whiteboard App

Technical reference for building, deploying, and extending the app. End-user documentation is in [README.md](README.md).

---

## Build & deploy

```bash
# Install JS dependencies (run once)
make deps

# Start webpack watch (development hot-reload)
make dev

# Full production build → whiteboard_app.tar.gz
make package

# Deploy to your Splunk server and restart Splunkd (required for .conf changes)
make deploy

# Deploy without restarting Splunk (JS, icons, static assets)
make deploy-norestart
```

Set `SPLUNK_HOST` for deploy targets — copy `deploy.local.mk.example` to `deploy.local.mk` (gitignored), or pass on the command line:

```bash
make deploy SPLUNK_HOST=user@host
```

> **Note:** `make deploy` restarts Splunkd (required when `collections.conf` or `transforms.conf` changes). For JS/CSS/icon-only changes use `make deploy-norestart` and **hard-refresh** the browser (Cmd+Shift+R) to bust Splunk Web's static-asset cache.

### Requirements

| Dependency | Version |
|---|---|
| Splunk Enterprise | >= 9.0.0 |
| Splunk Cloud (Victoria) | >= 9.0.0 |
| Node.js (build only) | 22.x (use `nvm use 22`) |
| Yarn (build only) | 1.x |

### Splunk version compatibility

Minimum **9.0.0** on Enterprise and Cloud (tested stack: `@splunk/react-page` 8.x, `@splunk/react-ui` 5.x). The `app.manifest` declares `"Enterprise": "*"` for Splunkbase SSAI/SLIM compatibility (semver ranges like `>=9.0.0` are rejected; `Cloud` is not a valid manifest edition key). Splunk 8.x is not supported.

---

## App structure

```
whiteboard_app/
├── deploy.local.mk.example           # Copy → deploy.local.mk for local deploy host
├── Makefile
├── README.md                         # User guide
├── DEVELOPER.md                      # This file
├── assets/
│   ├── generated/                    # Example .whiteboard.json bundles (import via Export panel)
│   ├── prebuilt-templates/           # Shipped built-in templates
│   ├── generate_alt_icon.py          # Regenerate app icons from 400px master
│   ├── listing_icon_200.png          # Splunkbase listing (200×200)
│   ├── listing_icon_400.png          # Splunkbase listing (400×400)
│   └── screenshot.png                # README product screenshot
├── scripts/                          # Board/template generation utilities
└── src/
    ├── package/                      # Splunk app skeleton (copied verbatim to dist/)
    │   ├── default/
    │   │   ├── app.conf              # App identity & version
    │   │   ├── collections.conf      # KV Store collections
    │   │   ├── transforms.conf       # KV Store lookup definitions
    │   │   └── data/ui/
    │   │       ├── nav/default.xml
    │   │       └── views/whiteboard.xml
    │   ├── static/                   # App icons (mirror — same files as appserver/static)
    │   ├── appserver/
    │   │   ├── static/               # App icons + compiled JS bundle
    │   │   └── templates/
    │   │       └── whiteboard.html   # HTML shell loaded by Splunk Web
    │   ├── metadata/default.meta     # ACLs — all collections world-readable/writable
    │   └── app.manifest              # Splunkbase package manifest
    └── web/                          # React frontend (compiled → dist/appserver/static/)
        ├── index.jsx                 # Entry point
        ├── webpack.config.mjs
        ├── package.json
        ├── components/
        │   ├── App.jsx               # Board list + routing
        │   ├── CanvasPage.jsx        # Main canvas, toolbar, resizable sidebar
        │   ├── ShapesPanel.jsx       # Splunk shape library + Marketing Icons
        │   ├── TemplatePanel.jsx     # Built-in & user templates
        │   ├── LibraryPanel.jsx      # Browse libraries.excalidraw.com
        │   ├── BuildPanel.jsx        # Reveal-on-click steps
        │   ├── HistoryPanel.jsx      # Version snapshots
        │   └── ExportPanel.jsx       # PNG / PDF / JSON / link export
        ├── hooks/
        │   ├── useKVStore.js         # Board CRUD + auto-save
        │   ├── useVersions.js        # Snapshot CRUD
        │   └── useTemplates.js       # User template CRUD
        └── lib/
            ├── kvstoreClient.js      # Splunk KV Store REST wrapper (CSRF-safe)
            ├── shapes.js             # Splunk shape factory functions
            ├── shapeIcons.js         # SVG markup for shape library
            ├── marketingIcons.js     # Splunk Marketing Icons (raw SVG strings)
            ├── brandIcons.js         # Brand logo icons
            ├── drpIcons.js           # Pre-encoded icons for DRP-style templates
            ├── prebuiltTemplates.js  # Shipped built-in template registry
            ├── boardBundle.js        # .whiteboard.json import/export format
            └── build.js              # Build/reveal step helpers
```

---

## KV Store collections

| Collection | Purpose |
|---|---|
| `whiteboards` | Board metadata + serialised canvas elements |
| `whiteboard_versions` | Named snapshots per board |
| `whiteboard_revisions` | Automatic revision history per board |
| `whiteboard_templates` | User-saved templates (elements + embedded files) |
| `whiteboard_template_revisions` | Automatic revision history per template |

### Board visibility (namespaces)

| Visibility | KV namespace | `owner` / `sharing` |
|---|---|---|
| **Everyone** (shared) | App-wide | `nobody` / `app` |
| **Just me** (private) | Per-user | current user / `user` |

New boards default to **private**. The owner can **Share with everyone** from the canvas, which copies the board (and its revision history) into the shared namespace and removes the private copy. Templates always use the shared namespace.

Board documents include a `visibility` field (`private` | `shared`). Legacy boards in the shared namespace without `visibility` are treated as shared.

> **Privacy caveat:** Private boards rely on Splunk's per-user KV namespace, which hides them from other standard users. Administrators holding `admin_all_objects` can still read every user's private boards. Treat "Just me" as isolation, not confidentiality.

All collections grant read/write to every Splunk user (`access = read : [ * ], write : [ * ]` in `metadata/default.meta`). Private boards rely on Splunk's user-scoped KV namespace for access control; tighten shared-collection ACLs in `metadata/default.meta` if your deployment requires restricted write access to shared boards.

---

## App icon

The app icon is a magenta→orange gradient easel with whiteboard doodles (flowchart, sticky note, checklist). Icons are shipped in **both** `static/` and `appserver/static/` (same files, all sizes) so Splunk picks them up regardless of which path it resolves:

| File | Size | Use |
|---|---|---|
| `appIcon.png` | 36×36 | App listing / launcher (light theme) |
| `appIcon_2x.png` | 72×72 | Retina launcher |
| `appIconAlt.png` | 36×36 | Dark-theme contexts |
| `appIconAlt_2x.png` | 72×72 | Retina dark theme |

Listing / Splunkbase masters live in `assets/listing_icon_200.png` and `assets/listing_icon_400.png`.

Regenerate all sizes from the 400px master:

```bash
python3 assets/generate_alt_icon.py   # requires Pillow + numpy
make package && make deploy-norestart
```

---

## Adding a new built-in template

### Option A — Author in the app

1. Draw the board in the running app.
2. Open the **Export** tab → **Download board JSON**.
3. Save the file under `assets/prebuilt-templates/` (e.g. `my-template.whiteboard.json`).
4. Register it in `assets/prebuilt-templates/manifest.json`.
5. Import the JSON in `src/web/lib/prebuiltTemplates.js` and append to `PREBUILT_TEMPLATES`.
6. Run `make package && make deploy-norestart`.

### Option B — Generate with scripts

Example boards can be generated with Python scripts in `scripts/`:

| Script | Purpose |
|---|---|
| `generate-cisco-data-fabric-board.py` | Cisco Data Fabric template |
| `generate-data-chaos-clarity-board.py` | Data Chaos to AI Clarity example |
| `generate-federated-search-board.py` | Federated Search example |
| `refine-splunk-platform-board.py` | Splunk Platform (dark) template |
| `assign-reveal-order.py` | Assign build/reveal step order to elements |
| `wbgen_common.py` | Shared helpers for board generation |

Output typically lands in `assets/generated/`. Copy or promote to `assets/prebuilt-templates/` and register as above.

To export user templates from a live Splunk instance:

```bash
python3 scripts/export-kv-templates.py
```

---

## Adding a new Splunk shape

1. Open `src/web/lib/shapes.js`.
2. Export a new factory function (see `universalForwarder`, `indexer`, etc. as examples).
3. Add it to the `SHAPE_CATEGORIES` export so it appears in the Shapes panel.
4. For **SVG Icon** insert mode, add SVG markup in `src/web/lib/shapeIcons.js` via `getShapeSvgMarkup`.
5. Optionally map an `@splunk/react-icons` icon in `ShapesPanel.jsx`'s `SHAPE_ICONS` map for the **Elements** mode button preview.

### Adding brand or marketing icons

- **Marketing icons:** add SVG strings to `src/web/lib/marketingIcons.js`.
- **Brand logos:** run `scripts/build-brand-icons.py` or extend `src/web/lib/brandIcons.js` (brand marks are not tintable).

---

## Splunkbase listing

Marketing copy for Splunkbase lives in [splunkbase.md](splunkbase.md).
