# Splunk Whiteboard App

<p align="center">
  <img src="assets/listing_icon_400.png" alt="Splunk Whiteboard App icon" width="160" />
</p>

Collaborative whiteboard embedded inside Splunk — built with React + [Excalidraw](https://github.com/excalidraw/excalidraw), styled with `@splunk/react-ui`, persisted via Splunk KV Store.

**GitHub:** https://github.com/bautt/splunk-whiteboard-app

<p align="center">
  <img src="assets/screenshot.png" alt="Splunk Whiteboard App — Cisco Data Fabric architecture diagram with Splunk shape library" width="900" />
</p>

---

## Features

| Area | Details |
|---|---|
| **Drawing** | Free-hand pencil, text, shapes, arrows, sticky notes, eraser |
| **Splunk shapes** | Forwarder (UF/HF), Indexer, Search Head, Deployment Server, Cluster Manager, License Manager, Edge Processor, Ingest Processor, SplunkCloud, and more |
| **SVG icon mode** | All Splunk infrastructure shapes can be inserted as colourable SVG images instead of vector elements |
| **Marketing icons** | 50 Splunk Marketing Icons — searchable, individually colourable, inserted as SVG images onto the canvas |
| **Templates (built-in)** | Splunk Platform (dark canvas), Cisco Data Fabric, Cisco Data Fabric (MDL) — plus user-saved templates in KV Store |
| **Templates (user)** | Save any board as a named template; **Replace board** loads a template onto the canvas (discards unsaved changes) |
| **Excalidraw libraries** | Browse and import from [libraries.excalidraw.com](https://libraries.excalidraw.com/) directly in the sidebar |
| **Persistence** | All boards stored in Splunk KV Store — visible and editable by every Splunk user |
| **Build / reveal-on-click** | PowerPoint-style progressive reveal — tag elements/groups into ordered steps that appear one click at a time in Present mode, with optional fade-in and camera-follow |
| **Version history** | Named snapshots per board with single-click restore |
| **Resizable sidebar** | Drag the left edge of the sidebar to resize; preference saved in `localStorage` |
| **Export** | PNG, SVG, JSON (Excalidraw native), and a shareable board URL |
| **Themes** | Follows Splunk's dark / light colour scheme automatically |

---

## Usage

### Creating and managing boards

1. Open the app at **Apps → Whiteboard App** (or navigate to `/en-US/app/whiteboard_app/whiteboard`).
2. Click **+ New Board** and enter a name. Boards auto-save every few seconds.
3. Rename a board by clicking its title in the board list.
4. Delete a board from the board list (trash icon).

### Drawing

Use the **Excalidraw toolbar** at the top of the canvas:

| Tool | Shortcut |
|---|---|
| Select / Move | `V` or `1` |
| Rectangle | `R` or `3` |
| Diamond | `D` or `4` |
| Ellipse | `O` or `5` |
| Arrow | `A` or `6` |
| Line | `L` or `7` |
| Free-draw | `P` or `8` |
| Text | `T` or `2` |
| Eraser | `E` or `0` |
| Zoom in / out | `Ctrl +` / `Ctrl -` |
| Fit canvas | `Shift 1` |

Double-click any shape to edit its label. Drag elements freely; hold `Shift` to constrain angles.

### Splunk Shape Library

Open the **Shapes** tab in the right sidebar.

- **Insert as elements** mode — adds a grouped Excalidraw element set (editable, scalable).
- **Insert as SVG** mode — adds a colourable SVG image. Use the colour picker or preset swatches to choose the fill colour before inserting.

Categories available:
- **Data Sources** — syslog, database, cloud, API, endpoint
- **Splunk Infrastructure** — Universal Forwarder, Heavy Forwarder, Indexer, Search Head, Cluster Manager, Deployment Server, License Manager, Edge Processor, Ingest Processor, SplunkCloud
- **Network** — firewall, router, switch, load balancer
- **Output / Destinations** — SIEM, ticketing, email, webhook

### Splunk Marketing Icons

At the bottom of the **Shapes** tab, expand **Splunk Marketing Icons**. Pick a colour, then click any icon to insert it onto the canvas as a tinted SVG.

### Templates

Open the **Templates** tab.

**Built-in templates** (read-only, shipped with the app):

| Template | Description |
|---|---|
| Splunk Platform (dark canvas) | Splunk platform architecture on a dark canvas; supports Present / Build mode |
| Cisco Data Fabric | Cisco Data Fabric architecture overview |
| Cisco Data Fabric (MDL) | Cisco Data Fabric with MDL layer detail |

Additional example boards ship under `assets/generated/` (e.g. Data Chaos to AI Clarity, Federated Search). Regenerate or upload with `scripts/generate-*-board.py` or import a `.whiteboard.json` via the Export panel.

**Replace board** (built-in or saved templates):

1. Open the **Templates** tab and click **Replace board** on a template card.
2. Confirm — the current canvas is replaced; unsaved changes are lost. Save first if you need to keep them.

**Saving a custom template:**

1. Draw or load any board.
2. In the Templates tab click **💾 Save current board as template**.
3. Enter a name (and optional description) and press **Save template**.

The template appears under **Saved templates** in KV Store (`whiteboard_templates` collection), visible to all users on the instance.

**Updating or deleting a custom template:**

Use **Update** on a saved template card to overwrite it with the current canvas (previous versions are kept automatically). Click the trash icon and confirm **Delete** to remove a template.

### Excalidraw Libraries

Open the **Libraries** tab. The panel fetches the live catalog from [libraries.excalidraw.com](https://libraries.excalidraw.com/). Click **Import** on any library to load its shapes into Excalidraw's built-in library panel (bottom-left toolbar icon).

### Build (reveal on click)

Open the **Build** tab to set up a PowerPoint-style progressive reveal.

1. Select elements (or a group) on the canvas and click **Add selection as step N**. Repeat to create an ordered sequence. Whole groups are tagged together.
2. Or click **Auto: by group / left→right / top→bottom / bottom→top** to generate one step per group automatically.
3. Reorder steps with ↑/↓, focus a step on the canvas with ⊙, or remove a step with 🗑.

Then click **Present**. The presenter automatically enters Build mode: each click (or `→` / `Space`) reveals the next step; `←` steps back; `Esc` exits. Toggle **Fade** (smooth fade-in) and **Follow** (camera pans to each new group — off by default) from the presentation bar. The reveal never alters your saved board — the scene is restored on exit.

If a board has no build steps, Present mode falls back to stepping through Excalidraw **frames** as slides.

### Version History

Open the **History** tab. Click **Save snapshot** to capture a named checkpoint. Click **Restore** next to any snapshot to roll the board back to that state.

### Export

Open the **Export** tab for:

- **PNG** — rasterised at 2× resolution
- **SVG** — fully scalable vector export
- **JSON** — Excalidraw-native format (re-import via File → Open)
- **Copy link** — sharable URL that opens this board directly

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

Set `SPLUNK_HOST` for deploy targets — copy `deploy.local.mk.example` to `deploy.local.mk` (gitignored), or pass on the command line: `make deploy SPLUNK_HOST=user@host`.

> **Note:** `make deploy` restarts Splunkd (required when `collections.conf` or `transforms.conf` changes). For JS/CSS/icon-only changes use `make deploy-norestart` and **hard-refresh** the browser (Cmd+Shift+R) to bust Splunk Web's static-asset cache.

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

## App structure

```
whiteboard_app/
├── deploy.local.mk.example           # Copy → deploy.local.mk for local deploy host
├── Makefile
├── README.md
├── assets/
│   ├── generated/                      # Example .whiteboard.json bundles (import via Export panel)
│   ├── prebuilt-templates/             # Shipped built-in templates
│   ├── generate_alt_icon.py            # Regenerate app icons from 400px master
│   ├── listing_icon_200.png            # Splunkbase listing (200×200)
│   ├── listing_icon_400.png            # Splunkbase listing (400×400)
│   └── screenshot.png                  # README product screenshot
└── src/
    ├── package/                        # Splunk app skeleton (copied verbatim to dist/)
    │   ├── default/
    │   │   ├── app.conf                # App identity & version
    │   │   ├── collections.conf        # KV Store collections (whiteboards, versions, templates)
    │   │   ├── transforms.conf         # KV Store lookup definitions
    │   │   └── data/ui/
    │   │       ├── nav/default.xml
    │   │       └── views/whiteboard.xml
    │   ├── static/                     # App icons (mirror — same files as below)
    │   │   ├── appIcon.png             # 36×36 (transparent)
    │   │   ├── appIcon_2x.png          # 72×72
    │   │   ├── appIconAlt.png          # 36×36
    │   │   └── appIconAlt_2x.png       # 72×72
    │   ├── appserver/
    │   │   ├── static/                 # App icons + compiled JS bundle
    │   │   │   ├── appIcon.png         # 36×36 (transparent)
    │   │   │   ├── appIcon_2x.png      # 72×72
    │   │   │   ├── appIconAlt.png      # 36×36
    │   │   │   └── appIconAlt_2x.png   # 72×72
    │   │   └── templates/
    │   │       └── whiteboard.html     # HTML shell loaded by Splunk Web
    │   ├── metadata/default.meta       # ACLs — all collections world-readable/writable
    │   └── app.manifest                # Splunkbase package manifest
    └── web/                            # React frontend (compiled → dist/appserver/static/)
        ├── index.jsx                   # Entry point
        ├── webpack.config.mjs
        ├── package.json
        ├── components/
        │   ├── App.jsx                 # Board list + routing
        │   ├── CanvasPage.jsx          # Main canvas, toolbar, resizable sidebar
        │   ├── ShapesPanel.jsx         # Splunk shape library + Marketing Icons
        │   ├── TemplatePanel.jsx       # Built-in & user templates
        │   ├── LibraryPanel.jsx        # Browse libraries.excalidraw.com
        │   ├── HistoryPanel.jsx        # Version snapshots
        │   └── ExportPanel.jsx         # PNG / SVG / JSON / link export
        ├── hooks/
        │   ├── useKVStore.js           # Board CRUD + auto-save
        │   ├── useVersions.js          # Snapshot CRUD
        │   └── useTemplates.js         # User template CRUD
        ├── lib/
        │   ├── kvstoreClient.js        # Splunk KV Store REST wrapper (CSRF-safe)
        │   ├── shapes.js               # Splunk shape factory functions
        │   ├── marketingIcons.js       # Splunk Marketing Icons (raw SVG strings)
        │   ├── drpIcons.js             # Pre-encoded icons for DRP-style templates
        │   ├── prebuiltTemplates.js    # Shipped built-in template registry
        │   └── nanoid.js               # Lightweight unique-ID generator
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

All collections grant read/write to every Splunk user (`access = read : [ * ], write : [ * ]` in `metadata/default.meta`). This is intentional for collaborative editing on a shared instance — any user can modify or delete any board. Tighten those ACLs in `metadata/default.meta` if your deployment requires restricted write access.

---

## Adding a new built-in template

1. Author a board in the app or generate one with `scripts/generate-*-board.py` (see `scripts/wbgen_common.py`).
2. Export **Download board JSON** from the Export panel, or write to `assets/prebuilt-templates/`.
3. Register it in `assets/prebuilt-templates/manifest.json`.
4. Import the JSON in `src/web/lib/prebuiltTemplates.js` and append to `PREBUILT_TEMPLATES`.
5. Run `make package && make deploy-norestart` to deploy.

To export KV templates from a live Splunk instance: `scripts/export-kv-templates.py`.

---

## Adding a new Splunk shape

1. Open `src/web/lib/shapes.js`.
2. Export a new factory function (see `universalForwarder`, `indexer`, etc. as examples).
3. Add it to the `SHAPE_CATEGORIES` export so it appears in the Shapes panel.
4. Optionally map an `@splunk/react-icons` icon in `ShapesPanel.jsx`'s `SHAPE_ICONS` map.

---

## Requirements

| Dependency | Version |
|---|---|
| Splunk Enterprise | >= 9.0.0 |
| Splunk Cloud (Victoria) | >= 9.0.0 |
| Node.js (build only) | 22.x (use `nvm use 22`) |
| Yarn (build only) | 1.x |

### Splunk version compatibility

Minimum **9.0.0** on Enterprise and Cloud (tested stack: `@splunk/react-page` 8.x, `@splunk/react-ui` 5.x). The `app.manifest` declares `"Enterprise": "*"` for Splunkbase SSAI/SLIM compatibility (semver ranges like `>=9.0.0` are rejected; `Cloud` is not a valid manifest edition key). Splunk 8.x is not supported.
