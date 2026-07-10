# Release Notes

Highlights of recent Whiteboard App releases. For the full change list of any version, see the [GitHub Releases page](https://github.com/bautt/splunk-whiteboard-app/releases).

---

## v0.3.70 — 2026-07-10

**Board list layout & wording**
- Renamed **Starter boards** to **Example boards** throughout the app and docs.
- Your own boards now appear **first**; the shipped **Example boards** section moved to the **bottom** of the list.
- Fixed the cramped board card footer: **Open** is now a full-width button with the **Duplicate · Export · Copy link · Delete** actions on their own row below (no more truncated "Op…" button).

---

## v0.3.69 — 2026-07-10

**Starter boards replace the template concept**
- The board list now has a **Starter boards** section (Splunk Platform, Cisco Data Fabric, SVA C1/C11 & C3/C13). Click **Use** to create your own editable private copy and open it — the shipped originals never change, so app updates can't overwrite your work.
- **Duplicate** action on every board card makes a private copy (`<name> (copy)`), so branching off any board (including a shared one) is one click.
- The separate **Templates** tab and the user-saved-template feature (with its 30-version history) have been removed. Reusing a layout across a team is now: make a board, share it, and colleagues **Duplicate** it.
- Existing user-saved templates are automatically **migrated to shared boards** on first load after upgrade.

**Uninstall cleanup**
- The **About** tab has a new *Danger zone* with **Delete all whiteboard data** — a guarded (type-to-confirm) action that purges every board, its history/snapshots, thumbnails, and legacy template data from KV Store before uninstalling the app.

---

## v0.3.68 — 2026-07-10

**SVA architecture templates**
- New prebuilt templates: **SVA C3/C13 — SHC Single Site** (Search Head Cluster) and **SVA C1/C11 — Single Site** (standalone search heads), with Splunk shape icons and doc links.
- Board generators (`scripts/generate-c3c13-shc-board.py`, `scripts/generate-c1c11-board.py`) and shared layout helpers for tight-fit text and baselines.

**Export all as ZIP**
- **Export all** now downloads a `.zip` archive with one `<name>.whiteboard.json` file per board (same format as single-board **Export**), instead of a single combined collection JSON.
- Legacy collection exports can still be imported via **Import board…**.

---

## v0.3.65 — 2026-07-10

**Board previews in the list**
- Each board card now shows a thumbnail preview of its content, so boards are easy to tell apart at a glance.
- Previews are stored in a dedicated `whiteboard_thumbnails` KV collection and refreshed shortly after edits are saved. Boards that don't yet have a stored preview generate one on demand the first time they scroll into view, then cache it for next time.
- Deleting a board also removes its stored preview.

---

## v0.3.64 — 2026-07-10

**Import & export from the board list**
- **Import board…** in the list toolbar loads one or more `.json` exports (single board or a legacy "export all" collection), creating them as private boards. Multiple files can be selected at once.
- **Export** on each board card downloads that board as `<name>.whiteboard.json`.
- **Export all** downloads every accessible board as individual `.whiteboard.json` files inside a ZIP archive.

---

## v0.3.63 — 2026-07-10

**Smarter entry page**
- First run (no saved boards) now opens straight onto an empty whiteboard instead of an empty list. Once any board exists, the app opens on the board list.

**About tab as a quick guide**
- The About tab now embeds a concise user guide with a **TL;DR** (build a whiteboard, use shapes & libraries, group & assign order, present) plus sections for getting started, drawing/shapes/libraries, grouping & presenting, and export/sharing — with links to the full README, release notes, and developer guide.

---

## v0.3.62 — 2026-07-10

**Theme reliability (readable in dark or light)**
- The app now reads Splunk Web's *actual* theme via Splunk's theme API (`getUserTheme`) instead of guessing from the OS `prefers-color-scheme`. Fixes unreadable text when the OS/browser is in dark mode but Splunk Web is light (or vice versa).

**Duplicate boards / delete-safety (data-loss fix)**
- Boards are de-duplicated by key, so a board no longer appears twice (once "Shared", once "Private"). This removes the trap where deleting one card deleted the single underlying record for both.
- Legacy boards (created before RBAC, with no visibility field) are classified as **shared**, and a board's scope is aligned to its visibility so edits/deletes target the correct namespace.

**Template appearance saved & restored**
- Saving a board as a template now stores its canvas theme and background; applying the template restores that appearance. Previously user templates lost theme/background on save and apply. Template revisions capture appearance too.

---

## v0.3.61 — 2026-07-10

**RBAC hardening & sharing safety**
- Granted `write` on the `whiteboard_revisions` KV collection — fixes silent autosave-history failures for non-privileged users on shared boards.
- `shareBoard` is now failure-safe/idempotent (key-preserving upsert, best-effort history migration, surfaced warnings).
- Optimistic `updated_at` conflict check on board writes and autosave, with a reload/overwrite banner; autosave pauses on conflict so concurrent edits are never clobbered.

**UI polish**
- Visibility toggle and filter tabs now use Splunk `RadioBar`/`TabBar` (theme-aware, accessible).
- Share and delete confirmations use Splunk `Modal` instead of native `confirm()`.

**Template fixes**
- Templates apply their intended theme/background on load (fixes Splunk Platform loading in light mode).
- Splunk Platform ships as **light** and **dark** variants; Cisco Data Fabric templates default to dark.
- Reordered Platform build steps so the Correlate/Analyze pillar reveals fully before Act/Automate.

**Navigation & libraries**
- Opening a board pushes a history entry, so the browser Back button returns to the board list instead of exiting to the About tab.
- Wired up Excalidraw `useHandleLibrary` + `libraryReturnUrl` so libraries install from libraries.excalidraw.com and persist across reloads.

---

## v0.3.59 — 2026-07-10

- `state_change_requires_restart = true` in `app.conf` — Splunk Manager shows **Restart Required** after install/upgrade/enable/disable, avoiding HTTP 500 when opening the app before Splunk Web picks up HTML templates.
- README: Sharing & access section; post-install restart note.

---

## v0.3.58 — 2026-07-10

- Documentation: README redesigned as an Excalidraw-first user guide (templates, shapes/SVGs, export/import, Present mode); build/deploy/extension guides moved to `DEVELOPER.md`.
- Build / Present: reveal-on-click workflow improvements; new `scripts/assign-reveal-order.py` helper.
- Cisco Data Fabric template asset refreshed; board bundle import/export refinements.

---

## v0.3.54 — 2026-06-22

- SSAI / SLIM validation: removed invalid `python.version` from `app.conf`; set `platformRequirements.splunk.Enterprise` to `"*"`.
- Splunkbase listing copy and README screenshot updates.

---

## v0.3.53 — 2026-06-22

- Splunkbase readiness: package `README.md` and `PRIVACY.md` in the tarball; manifest updated with release date, company, privacy policy, and release-notes paths.
- Enabled `check_for_updates`; added `splunkbase.md` listing copy; documented minimum Splunk Enterprise/Cloud 9.0.0.

---

## v0.3.51 — 2026-06-18

- Fixed custom colour field showing brown after selecting the Splunk navy preset (removed incorrect hardcoded dark-mode value).
- Preserve `displayBackgroundColor` when Excalidraw `onChange` fires after appearance-panel updates.

---

## v0.3.50 — 2026-06-18

- Canvas dark mode: persist `displayBackgroundColor` so a picked colour survives light ↔ dark toggles (fixes Splunk navy `#001B3A` shifting).
- Performance: replaced slow brute-force colour inversion with a cached iterative solver.
- Added Splunk navy (`#001b3a`) swatch to the Canvas appearance panel.

---

## v0.3.48 — 2026-06-18

- Board delete cascades removal of revision and snapshot KV rows.
- Autosave persists correctly for cleared canvases after Excalidraw mounts.
- Templates: **Replace board** replaces misleading **Apply**, with an unsaved-changes warning.
- 5 MB size cap on imported Excalidraw library JSON; portable `perl` telemetry-check build step.
- New Federated Search architecture example board.

---

## v0.3.47 — 2026-06-18

- Synced `app.manifest` with `app.conf`; declared Splunk Cloud support.
- Cascade-delete board history on board delete; fixed autosave for cleared canvases.
- Library import size limit, portable build tooling, README updates.

---

## v0.3.36 — 2026-06-17

- **About tab** showing app version and README link.
- **Dark canvas**: theme toggle auto-applies charcoal/black or white background.
- **Template SVG icons** rehydrate on save/apply so placeholders no longer appear.
- **Revision history**: auto-revisions on save plus named snapshots in the History panel.
- Dedicated Canvas appearance sidebar tab for theme and background colour.
