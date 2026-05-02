# Nova

Nova is the umbrella for the entire app: chrome, persistence, modal stack,
and the registry of editor surfaces. The implementation entry point is
[`src/nova_base.jsx`](../src/nova_base.jsx) (mounted from
[`src/main.jsx`](../src/main.jsx)).

## Composition

`NovaApp` lives inside two providers and renders the chrome around whichever
view is active:

- [[left_sidebar]] — primary nav + workspace switcher (or `MobSidebar` on phones)
- [[utils_bar]] — back / forward / search bar, fused into the tab strip
- [[home]] — the default screen when no doc tab is active
- [[app_catalogue]] — alternate landing view that lists every Nova app
- [[new_doc_popup]] — modal launched from "+ New document"
- [[nova_settings]] — appearance + per-app colour overrides

## Top-level state owned by `NovaApp`

| State | Purpose |
|---|---|
| `view`        | Which non-editor screen is active (`home`, `starred`, `all`, `catalogue`, or an app id). |
| `navHist`     | Last 50 `{view, activeTabId}` pairs powering [[utils_bar]]'s back / forward. Coalesces rapid changes within 150 ms into one entry. |
| `showND` / `ndType` | Visibility + initial app id for [[new_doc_popup]]. |
| `showSettings`| Toggles [[nova_settings]]. |
| `showPalette` | Toggles ⌘K command palette. |
| `showShortcuts` | Toggles the keyboard cheatsheet. |
| `collapsed`   | Persists the [[left_sidebar]] collapsed state for the session. |

## Cross-cutting hooks

`NovaApp` composes the rest of the system from shared hooks:

- `useWSStore`   — workspaces + docs in `localStorage` (`nova:workspaces:v1`).
- `useTabs`      — open editor tabs and the active tab id.
- `useAppColors` — per-`(workspace, app)` colour overrides.
- `useDeviceCaps` — `isMobile` / `isTouch`, recomputed on resize.
- `useKbd("n")` / `useKbd("k")` — global ⌘N for new doc, ⌘K for palette.

## Singletons and special cases

- **Calendar** is a workspace-wide singleton. `openCalendarSingleton()` reuses
  the one calendar doc per workspace; it is never reachable through the
  normal [[new_doc_popup]] flow.
- On the production host (`nova-offline.com`) any deep link is rewritten to `/`
  in [`src/main.jsx`](../src/main.jsx) before render.
