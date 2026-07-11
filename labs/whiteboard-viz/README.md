# Whiteboard Viz (Labs)

**Experimental. Splunk 10.4+ only.** A separate, companion Splunk app that renders
[Whiteboard App](../../README.md) boards **live** inside Dashboard Studio dashboards
via the Splunk 10.4 Dashboard Extension Framework — instead of exporting a flat PNG.

Built with `@splunk/create --mode=dashboard-studio-extension` (React template) and
reconciled to read the main app's KV boards and reuse its render helpers.

## Why a separate app

| | `whiteboard_app` (main) | `whiteboard_viz` (this, labs) |
|--|--|--|
| App id | `whiteboard_app` | `whiteboard_viz` |
| Version | production (semver) | `0.1.0`, independent lifecycle |
| Splunk floor | Enterprise `*` | Enterprise `10.4` |
| Build | `/Makefile` + `/src` (webpack) | `labs/whiteboard-viz` (esbuild, `@splunk/create`) |
| Status | cloud-vetted, shippable | experimental, not for production |

Keeping it separate means the cloud-vetted main app is never destabilized by spike
churn, the 10.4 floor never leaks into the main app, and both install side by side.

## What it reads

The visualization is fed by a Dashboard Studio **kvstore-lookup dataSource**:

```spl
| inputlookup whiteboards where _key="<board id>"
```

**Prerequisite: the main `whiteboard_app` must be installed.** It owns the
`whiteboards` KV collection *and* exports the `whiteboards` lookup system-wide, so
this app relies on that global lookup rather than declaring its own (a local
transform would shadow the global one and fail to open the collection from the
`whiteboard_viz` context). The row's `elements_json` field carries the serialized
Excalidraw board, which is parsed and drawn read-only via `exportToSvg`.

Icon rehydration reuses the main app's **data-only** icon libraries
(`drpIcons`, `marketingIcons`, `brandIcons`, `tintSvg`) so library icons render
without bloating each row. Shape icons that depend on `@splunk/react-icons`
(`shape-*`) are a known v0.1.0 gap — they draw only when embedded in the payload.

## Project layout

```
labs/whiteboard-viz/
├── package.json                 # esbuild build/package scripts + deps
├── build.mjs / package.mjs      # @splunk/create build + packager (extended)
├── build-plugins/               # css inline + asset-size warnings
├── package/
│   ├── app/app.conf             # app identity (id, version, label) — source of truth
│   ├── metadata/default.meta    # visualization export
│   ├── static/                  # app icons
│   └── LICENSE
└── visualizations/whiteboard_viz/
    ├── config.json              # viz metadata, data contract, size
    └── src/
        ├── visualization.jsx    # entry: dataSource → parse → exportToSvg
        ├── boardRender.js       # parse + icon rehydration (shared render code)
        └── visualization.css
```

## Build, package, deploy

Self-contained — does **not** touch the main app build.

```bash
cd labs/whiteboard-viz
yarn install          # first time (network)
yarn build:prod       # bundle → dist/whiteboard_viz/visualization.js
yarn package          # → dist/whiteboard_viz-<version>-<githash>.spl
```

App identity (id, version, label, author, description) lives in
`package/app/app.conf`. Install the `.spl` on a **test/local 10.4+** instance only.

## Status / next steps

v0.1.0 scaffold: app identity, isolation, build/package (with KV lookup + icons +
10.4 manifest), and a read-only Excalidraw renderer wired to the `elements_json`
data contract. Still to validate on a live 10.4 instance:

1. Load the extension in Dashboard Studio and confirm the viz registers.
2. Wire a real kvstore-lookup dataSource to a sample board and verify rendering.
3. Run the payload/truncation test (large `elements_json` vs. search field limits).
4. Factor a single shared render module (incl. the shape-icon path) used by both apps.
