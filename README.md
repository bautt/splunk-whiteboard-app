# Splunk Whiteboard App

<p align="center">
  <img src="assets/listing_icon_400.png" alt="Splunk Whiteboard App icon" width="160" />
</p>

Draw architecture diagrams, workshop sketches, and presentation flows **inside Splunk** — powered by [Excalidraw](https://excalidraw.com), the open-source infinite canvas. No external whiteboard service, no separate login: boards live in Splunk KV Store and are available to everyone on your instance.

**GitHub:** https://github.com/bautt/splunk-whiteboard-app

<p align="center">
  <img src="assets/screenshot.png" alt="Splunk Whiteboard App — Cisco Data Fabric architecture diagram with Splunk shape library" width="900" />
</p>

---

## Get started

1. Open **Apps → Whiteboard App** (or go to `/en-US/app/whiteboard_app/whiteboard`).
2. Enter a name and click **Create board** to start from a blank Excalidraw canvas.
3. Draw with the Excalidraw toolbar. Your work **auto-saves** every few seconds.

From the board list you can search boards, rename them, copy a shareable link, or delete boards you no longer need.

---

## Drawing with Excalidraw

The canvas is a full Excalidraw editor embedded in Splunk Web. Use the toolbar at the top of the canvas:

| Tool | Shortcut |
|---|---|
| Select / Move | `V` or `1` |
| Text | `T` or `2` |
| Rectangle | `R` or `3` |
| Diamond | `D` or `4` |
| Ellipse | `O` or `5` |
| Arrow | `A` or `6` |
| Line | `L` or `7` |
| Free-draw | `P` or `8` |
| Eraser | `E` or `0` |
| Zoom in / out | `Ctrl +` / `Ctrl -` |
| Fit canvas | `Shift 1` |

Double-click any shape to edit its label. Drag elements freely; hold `Shift` to constrain angles. Group elements with Excalidraw's built-in grouping (`Ctrl+G`).

The right sidebar adds Splunk-specific panels on top of Excalidraw — shapes, templates, libraries, build steps, history, and export. Drag the left edge of the sidebar to resize it; your preference is remembered.

---

## Start from scratch or use a template

### Blank board

The fastest path: **Create board** on the home screen. You get an empty Excalidraw canvas. Add Splunk shapes from the sidebar, draw freehand, or import content (see [Export & import](#export--import) below).

### Built-in examples

Open the **Templates** tab in the sidebar. Shipped examples include:

| Template | What it's for |
|---|---|
| Splunk Platform (dark canvas) | Splunk platform architecture on a dark canvas; works well with Present / Build mode |
| Cisco Data Fabric | Cisco Data Fabric architecture overview |
| Cisco Data Fabric (MDL) | Cisco Data Fabric with MDL layer detail |

Click **Replace board** on a template card to load it onto the canvas. **This replaces everything on the canvas** — save your current board first if you need to keep it.

### Save your own templates

Reuse a layout across workshops or teams:

1. Draw or load the board you want to reuse.
2. In the **Templates** tab, click **Save current board as template**.
3. Enter a name (and optional description) and press **Save template**.

Saved templates appear under **Saved templates** and are visible to all users on the Splunk instance.

**Update** a saved template to overwrite it with the current canvas. The app keeps the last 30 versions automatically — open **History** on a template card to restore an older version.

**Delete** removes a template permanently (trash icon on the card).

> **Tip:** Templates capture the canvas content (elements and embedded images), not the board name. Use **Replace board** to apply a template to your current board, then save the board normally.

---

## Icons, shapes, and SVGs

Open the **Shapes** tab (Shape library) in the sidebar.

### Splunk infrastructure shapes

Categories include **Data Sources**, **Splunk Infrastructure** (UF/HF, Indexer, Search Head, Cluster Manager, Deployment Server, License Manager, Edge Processor, Ingest Processor, Splunk Cloud, and more), **Network**, and **Output / Destinations**.

Choose how shapes are inserted with the **Insert as** toggle:

| Mode | Best for |
|---|---|
| **Elements** | Editable Excalidraw vector groups — resize, restyle, and ungroup like native shapes |
| **SVG Icon** | A colourable SVG image on the canvas — pick a fill colour first, then click a shape |

In **SVG Icon** mode, use the colour picker, hex/RGB field, or preset swatches before inserting.

### Splunk Marketing Icons

Expand **Splunk Marketing Icons** at the bottom of the Shapes tab. Pick a colour, then click any of the 50 icons to place a tinted SVG on the canvas.

### Brand logos

Expand **Brand logos** for official Cisco, Kubernetes, OpenTelemetry, and Splunk marks. These use fixed brand colours (not tintable) and are useful in reference architectures.

### Excalidraw community libraries

Open the **Libraries** tab to browse [libraries.excalidraw.com](https://libraries.excalidraw.com/). Enable the catalog (one-time consent), then click **Import** on a library. Shapes appear in Excalidraw's library panel (book icon in the bottom-left toolbar) for drag-and-drop onto the canvas.

---

## Export & import

Open the **Export** tab in the sidebar.

### Board backup (move between instances)

| Action | What it does |
|---|---|
| **Download board JSON** | Saves a `.whiteboard.json` file with elements, canvas settings, and embedded images — the app's native format |
| **Import board JSON…** | Loads a `.whiteboard.json` file onto the canvas (replaces current content; confirm before import) |

Use board JSON to back up work, share diagrams with colleagues, or move boards to another Splunk instance. After import, the board auto-saves once you return to editing.

### Images and sharing

| Action | What it does |
|---|---|
| **Download PNG** | Raster image of the canvas |
| **Download PDF** | PDF export of the canvas |
| **Copy shareable link** | URL that opens this board directly in Splunk |

### Dashboard Studio

**Dashboard Studio JSON** renders the canvas as a PNG and generates JSON you can paste into Dashboard Studio → Source as a `splunk.image` panel.

---

## Present your diagram

### Build mode (reveal on click)

Open the **Build** tab for PowerPoint-style progressive reveal:

1. Select elements (or a group) and click **Add selection as step N**, or use **Auto** (by group, left→right, top→bottom, etc.).
2. Reorder steps with ↑/↓, focus a step on the canvas, or remove steps.
3. Click **Present**. Each click (or `→` / `Space`) reveals the next step; `←` steps back; `Esc` exits.

Toggle **Fade** and **Follow** (camera pans to each new group) from the presentation bar. Reveal mode does not change your saved board — the scene is restored when you exit.

If a board has no build steps, Present mode steps through Excalidraw **frames** as slides instead.

### Version history

Open the **History** tab. **Save snapshot** captures a named checkpoint; **Restore** rolls the board back to that state.

---

## Sharing & access

Boards and saved templates are **shared on the whole Splunk instance** — there are no per-user private whiteboards. When you create a board, your username is stored as the owner (shown on the board card), but **any user** who can open the app can view, edit, and delete any board or template. This is intentional for collaborative workshops; use **History** snapshots or **Export → Download board JSON** if you need a backup before shared editing.

To restrict who can write boards, see [DEVELOPER.md](DEVELOPER.md) (KV Store ACLs).

---

## Requirements

| | |
|---|---|
| Splunk Enterprise | ≥ 9.0.0 |
| Splunk Cloud (Victoria) | ≥ 9.0.0 |

**After install or upgrade:** restart Splunk when Manager shows **Restart Required** (`state_change_requires_restart` in the app package). Opening the app before restart can return HTTP 500.

---

## For developers

Build, deploy, extend shapes, add shipped templates, and repository layout: **[DEVELOPER.md](DEVELOPER.md)**.
