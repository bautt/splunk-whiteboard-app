# Whiteboard App — Splunkbase listing content

Copy the sections below into the Splunkbase app listing fields (Summary, Details, Installation, Troubleshooting), matching the structure used for [Ponypoll](https://splunkbase.splunk.com/app/8767).

---

## Summary

Whiteboard App turns any Splunk instance into a collaborative architecture canvas — no external database, no middleware, no extra infrastructure. Draw Splunk platform diagrams, workshop layouts, and use-case storyboards directly inside Splunk Web with a full Excalidraw-powered editor styled to match Splunk's dark and light themes. Boards, templates, and version history persist in Splunk KV Store, so every user on the instance can open, edit, and share the same content. A built-in Splunk shape library covers forwarders, indexers, search heads, Edge Processor, Ingest Processor, Splunk Cloud, and more — plus 50 Splunk Marketing Icons you can tint and drop onto the canvas. Ship with ready-made templates (Splunk Platform, Cisco Data Fabric), save your own templates to KV Store, export PNG/SVG/JSON, or present step-by-step with Build mode progressive reveal. Optional Excalidraw library import is opt-in only. This is not a diagramming SaaS wrapped in an iframe — it is a native Splunk app built for architects, SEs, and workshop facilitators who want to sketch platform designs where their audience already lives.

---

## Details

### What it does

Whiteboard App is a React + Excalidraw custom HTML dashboard embedded in Splunk. Users create named boards from a board list, draw on an infinite canvas, and auto-save every few seconds. All data stays on your Splunk deployment.

### Drawing and shapes

- Full Excalidraw toolbar: select, shapes, arrows, free-draw, text, eraser, zoom, and grouping
- **Splunk Shape Library** — infrastructure stencils (UF/HF, Indexer, Search Head, Cluster Manager, Deployment Server, License Manager, Edge Processor, Ingest Processor, Splunk Cloud) plus data sources, network, and destination shapes
- Insert shapes as editable element groups or as colourable SVG images
- **Splunk Marketing Icons** — searchable set of 50 icons, individually tinted before insert
- **Brand icons** — Cisco, Kubernetes, OpenTelemetry, and Splunk marks for reference architectures in built-in templates

### Templates

Built-in read-only templates ship with the app:

| Template | Description |
|---|---|
| Splunk Platform (dark canvas) | Splunk platform architecture; supports Present / Build mode |
| Cisco Data Fabric | Cisco Data Fabric architecture overview |
| Cisco Data Fabric (MDL) | Cisco Data Fabric with MDL layer detail |

Users can save any board as a named template to KV Store, update or delete saved templates, and **Replace board** to load a template onto the current canvas.

### Present and Build mode

Tag canvas elements into ordered reveal steps for workshop walkthroughs. In **Present** mode, each click (or arrow key) reveals the next step with optional fade-in and camera-follow. Boards without build steps fall back to stepping through Excalidraw frames. The saved board is never modified during presentation.

### Version history and export

- Named snapshots per board with one-click restore
- Automatic revision history for boards and templates
- Export PNG (2× resolution), SVG, Excalidraw JSON, shareable board URL, or Dashboard Studio JSON (PNG embed)

### Data and storage

All application data is stored in Splunk KV Store collections in the `whiteboard_app` app context:

| Collection | Purpose |
|---|---|
| `whiteboards` | Board metadata and serialised canvas elements |
| `whiteboard_versions` | Named snapshots per board |
| `whiteboard_revisions` | Automatic revision history per board |
| `whiteboard_templates` | User-saved templates |
| `whiteboard_template_revisions` | Automatic revision history per template |

By default, all Splunk users can read and write all boards and templates (`access = read : [ * ], write : [ * ]`). This is intentional for collaborative workshop use. Tighten ACLs in `metadata/default.meta` before deployment if your organisation requires restricted write access.

### External services

The app does not phone home and includes no product analytics. The **Excalidraw Libraries** sidebar is disabled until the user explicitly opts in; when enabled, the browser contacts `https://libraries.excalidraw.com` to browse public shape libraries.

### Compatibility

| Platform | Minimum version |
|---|---|
| Splunk Enterprise | 9.0.0 |
| Splunk Cloud (Victoria) | 9.0.0 |

Splunk 8.x is not supported. The app uses `@splunk/react-page` 8.x and `@splunk/react-ui` 5.x on Splunk's custom HTML dashboard framework. No custom `bin/` search commands or data inputs are required. Expected to run on Splunk 10.x; no upper bound is declared.

### Roles and permissions

Any Splunk user who can access the app can create and edit boards. KV Store REST calls use the logged-in user's session. App installation requires `admin` or `sc_admin` (or equivalent on Splunk Cloud).

### Source and license

- **Source code:** https://github.com/bautt/splunk-whiteboard-app
- **License:** MIT
- **Author:** Tomas Baublys

---

## Installation

### Splunkbase (Splunk Enterprise)

1. Log in to [Splunkbase](https://splunkbase.splunk.com) and open the Whiteboard App listing.
2. Click **Download** and save `whiteboard_app.spl` (or `.tar.gz`).
3. In Splunk Web, go to **Apps → Manage Apps → Install app via upload**.
4. Upload the package and restart Splunk when prompted.
5. Open **Apps → Whiteboard App**, or navigate to `/en-US/app/whiteboard_app/whiteboard`.

### Splunk Cloud

1. Upload the app package through **Administration → Apps → Upload app** (or your stack's private-app workflow).
2. Ensure the app passes your org's Cloud vetting / AppInspect requirements.
3. After install, open **Apps → Whiteboard App** from the app launcher.

### Manual install (Splunk Enterprise)

```bash
# On a build machine with Node.js 22 and Yarn:
git clone https://github.com/bautt/splunk-whiteboard-app.git
cd splunk-whiteboard-app
make deps
make package
# Produces whiteboard_app.tar.gz

# On the Splunk server:
tar xzf whiteboard_app.tar.gz -C $SPLUNK_HOME/etc/apps/
chown -R splunk:splunk $SPLUNK_HOME/etc/apps/whiteboard_app
$SPLUNK_HOME/bin/splunk restart
```

### First run

On first open, Splunk creates the KV Store collections defined in `default/collections.conf`. No indexes, inputs, or forwarder configuration is required. Built-in templates are available immediately; user-created boards appear in the board list after the first save.

### Upgrading

Upload the newer package over the existing app and restart Splunk (or follow your Cloud upgrade process). KV Store data is preserved across upgrades unless collections are removed manually.

---

## Troubleshooting

### Blank page or "Loading…" never finishes

- Hard-refresh the browser (Cmd+Shift+R / Ctrl+Shift+R) to clear cached JavaScript after an upgrade.
- Confirm `appserver/static/whiteboard.bundle.js` exists under `$SPLUNK_HOME/etc/apps/whiteboard_app/`.
- Check the browser developer console for 404 errors on the bundle path.
- On Splunk Cloud, verify the app installed successfully and is not disabled.

### Boards fail to save (KV Store errors)

- Ensure KV Store is enabled on the instance (`server.conf` / Cloud: enabled by default on Victoria stacks).
- Confirm the `whiteboard_app` app is not disabled.
- Verify the user has permission to call KV Store REST endpoints (`/servicesNS/nobody/whiteboard_app/storage/collections/data/...`).
- After changing `collections.conf` or `metadata/default.meta`, restart Splunk so collections and ACLs are applied.

### Boards or templates missing after upgrade

- Data lives in KV Store collections, not in the app package. If collections were deleted or the app was removed with `remove-data=true`, boards cannot be recovered from the package alone.
- Export important boards as JSON from the **Export** panel before major changes.

### Another user deleted or overwrote my board

- Default ACLs allow every user to read and write all boards. This is by design for shared workshop instances.
- To restrict write access, edit `metadata/default.meta` before deployment (for example `write : [ admin, sc_admin, power ]` on collection stanzas) and restart Splunk.

### Excalidraw Libraries panel shows an error

- The feature requires outbound HTTPS from the user's browser to `libraries.excalidraw.com`. Corporate proxies or restrictive egress policies may block it.
- Click **Enable external libraries** in the Libraries tab to opt in; the app does not contact external sites until you do.

### Present / Build mode shows no steps

- Open the **Build** tab and add steps manually (**Add selection as step N**) or use an auto-layout button (by group, left→right, etc.).
- Built-in Splunk Platform template ships with pre-tagged build steps; blank boards need steps added first.
- Without build steps, Present mode falls back to Excalidraw **frames** if any exist on the canvas.

### Large boards feel slow

- Very complex canvases (thousands of elements or large embedded images) increase KV Store payload size and browser render time.
- Use PNG/SVG export for static sharing instead of embedding huge images directly on the canvas.

### Splunk 8.x

- Not supported. Minimum version is Splunk Enterprise or Splunk Cloud **9.0.0**.

### Getting help

- **Documentation:** https://github.com/bautt/splunk-whiteboard-app/blob/main/README.md
- **Issues:** https://github.com/bautt/splunk-whiteboard-app/issues
- **Contact:** tbaublys@splunk.com
