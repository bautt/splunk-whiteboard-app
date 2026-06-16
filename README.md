# Whiteboard App

Collaborative whiteboard for Splunk — built with React + [Excalidraw](https://github.com/excalidraw/excalidraw), styled with `@splunk/react-ui`, persisted via Splunk KV Store.

## Features

- Free-hand drawing, text, shapes, arrows, sticky notes
- Splunk shape library (forwarders, indexers, search heads, cloud, data sources)
- Pre-built use case templates (SIEM, Observability, IT Ops)
- Shared boards via KV Store (every Splunk user sees the same boards)
- Version history with named snapshots and restore
- Presentation mode (fullscreen, step through frames)
- Export to PNG, PDF, shareable link, or Dashboard Studio image panel
- Native Splunk dark/light theme

## Build & deploy

```bash
make deps      # install JS deps
make dev       # webpack watch
make package   # build → whiteboard_app.tar.gz
make deploy    # scp to your-splunk-host + restart Splunk
```

## App structure

```
src/
├── package/                     # Splunk app skeleton
│   ├── default/                 # app.conf, collections.conf, transforms.conf, nav, views
│   ├── appserver/templates/     # whiteboard.html (entry shell)
│   └── metadata/default.meta
└── web/                         # React frontend
    ├── index.jsx
    ├── components/              # App, BoardList, Canvas, side panels
    ├── hooks/                   # useKVStore, useVersions
    ├── lib/                     # theme bridge, PDF export, DS export
    ├── assets/                  # splunk-library.excalidrawlib
    └── templates/               # SIEM, observability, IT Ops JSON
```
