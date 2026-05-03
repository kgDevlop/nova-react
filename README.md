# Nova Office

GitHub Pages: https://kgdevlop.github.io/nova-react/

A local-first, offline-capable office suite. One workspace, six apps, no servers.
All documents live in your browser's storage and never leave the device unless
you explicitly export them.

```
npm install
npm run dev
```

## How the app works

Follow this list top-to-bottom to trace any user action from boot to localStorage:

1. **Boot** → [`src/nova_base.jsx`](./src/nova_base.jsx) — mounts `ThemeProvider` + `NotifProvider`, then renders `NovaRouter`
2. **Layout + routing** → [`src/shell/nova_router.jsx`](./src/shell/nova_router.jsx) — owns view state, tab strip, nav history, workspace handlers, and all modals
3. **Home / catalogue** → [`src/shell/home.jsx`](./src/shell/home.jsx) — renders doc grid/list and the app-catalogue screen
4. **Editor shell** → [`src/shell/shell.jsx`](./src/shell/shell.jsx) — wraps each open doc with toolbar, top bar, and right sidebar; wires auto-save
5. **App registry** → [`src/shell/registry.js`](./src/shell/registry.js) — maps `doc.type` → editor component; add a new app here (+ metadata in `constants/apps.js` + `src/apps/<id>.jsx`)
6. **Editors** → [`src/apps/<type>.jsx`](./src/apps/) — six pure editor canvases (writer, spreads, slides, draw, calendar, list)
7. **Doc state** → [`src/shared/hooks/doc_state.jsx`](./src/shared/hooks/doc_state.jsx) — `useDocState(doc, parse, onContentChange)`: parses on mount, re-parses on doc switch, serializes on every change
8. **Workspace store** → [`src/shared/hooks/store.jsx`](./src/shared/hooks/store.jsx) — `useWSStore` / `useTabs` / `useAutoSave` / `useAppColors`: all localStorage CRUD
9. **Theme** → [`src/shared/theme.jsx`](./src/shared/theme.jsx) — `buildTokens()` → token object; `useT()` in every component
10. **Constants** → [`src/shared/constants/`](./src/shared/constants/) — domain-grouped config: `apps.js`, `theme.js`, `toolbars.js`, `canvas.js`, `layout.js`

---

## What's inside

Each route below has a corresponding architecture note in [`obsidian/`](./obsidian)
that describes the underlying component and its contract.

### Shell

The application chrome that wraps every screen. It owns workspace switching,
tab navigation, command-palette search, and the modal stack.

- [`obsidian/nova.md`](./obsidian/nova.md) — top-level entry point and feature list
- [`obsidian/home.md`](./obsidian/home.md) — what the home surface composes
- [`obsidian/quick_start.md`](./obsidian/quick_start.md) — quick-start tile row
- [`obsidian/left_sidebar.md`](./obsidian/left_sidebar.md) — primary nav + workspace switcher
- [`obsidian/utils_bar.md`](./obsidian/utils_bar.md) — back / forward / search row
- [`obsidian/new_doc_popup.md`](./obsidian/new_doc_popup.md) — document creation modal
- [`obsidian/nova_settings.md`](./obsidian/nova_settings.md) — appearance + per-app colours
- [`obsidian/download.md`](./obsidian/download.md) — export-to-zip flow
- [`obsidian/text_editor.md`](./obsidian/text_editor.md) — toolbar formatting matrix

### Catalogue

Six live editors backed by a single registry. Each one renders inside
[`AppShell`](./src/shell/shell.jsx) and saves its own content via the shared
auto-save hook.

- [`obsidian/app_catalogue.md`](./obsidian/app_catalogue.md) — catalogue grid
- [`obsidian/app_list.md`](./obsidian/app_list.md) — registered app ids
- **Live**
  - [`obsidian/calendar.md`](./obsidian/calendar.md) — workspace-singleton calendar
  - [`obsidian/draw.md`](./obsidian/draw.md) — vector canvas editor
  - [`obsidian/spreads.md`](./obsidian/spreads.md) — spreadsheet with formulas
  - [`obsidian/slides.md`](./obsidian/slides.md) — presentation deck editor
  - [`obsidian/text_editor.md`](./obsidian/text_editor.md) — Writer's rich text
  - List, with a tree of indented to-dos
- **Beta** — forms, pdf, mail, video, message (not yet wired)

### Open issues

Roadmap and known bugs are tracked in
[`obsidian/issues.md`](./obsidian/issues.md). Branches follow `iss_<n>`.

## Project layout

```
src/
  main.jsx               app bootstrap (also rewrites deep links on prod)
  nova_base.jsx          providers only — ThemeProvider + NotifProvider
  Nova.css               legacy splash styles (kept for the welcome route)
  shell/
    nova_router.jsx      view routing, tab strip, nav history, modal stack
    shell.jsx            AppShell — chrome wrapping every open editor
    registry.js          doc.type → editor component map (add new apps here)
    home.jsx             HomeScreen + AppCatalogueScreen
  shared/
    left_sidebar.jsx     desktop + mobile primary nav and workspace switcher
    utils_bar.jsx        tab strip with back / forward / palette trigger
    topbar.jsx           per-editor title bar + bottom status bar
    toolbar.jsx          per-app formatting toolbar (TOOLBARS map)
    apps_sidebar.jsx     right-side panel surface (collapsible)
    atoms.jsx            AppChip, NovaLogo, TileGrid
    icons.tsx            single-source SVG icon set (I.*)
    theme.tsx            buildTokens() + ThemeProvider + useT()
    styling.js           injected global CSS rules (.nb, .ninput, .nmod, …)
    notifications.jsx    toast stack + useNotify()
    _utils.js            id / time / filter / sort helpers
    canvas_utils.jsx     SelectionHandles + slide theme helpers
    hooks/
      doc_state.jsx      useDocState — parse / re-init / serialize for editors
      store.jsx          useWSStore, useTabs, useAutoSave, useAppColors
      nav.jsx            useNavHistory — browser history integration
      system.jsx         useDeviceCaps, useKbd, useOut, useCanvasHistory
    constants/           domain-grouped config (re-exported via _constants.js)
      apps.js            app registry, creation modal, workspace emojis
      theme.js           colour schemes, accent presets, APP_COLORS
      toolbars.js        per-app toolbar configs, sidebar dims, shortcuts
      canvas.js          slide/draw geometry, SLIDE_THEMES, DRAW_TOOLS
      layout.js          shell, home, store, nav, per-editor dimensions
    modals/
      new_doc_popup.jsx  app-grid creation modal
      nova_settings.jsx  appearance + per-app colour panel
      palette.jsx        ⌘K command palette
      newws.jsx          new-workspace modal
      shortcuts.jsx      keyboard shortcuts cheatsheet
      types.ts           shared TypeScript types
  apps/
    writer.jsx           rich-text Writer
    spreads.jsx          Spreads — A1 grid + formulas
    slides.jsx           Slides — SVG-based deck
    draw.jsx             Draw — vector canvas
    list.jsx             List — indented to-dos
    calendar.jsx         Calendar — month/week/day views
```

## Conventions

- File and folder names use `_` as a word separator. Each editor file matches
  its app id and the slug of its sibling note in [`obsidian/`](./obsidian).
- Persistence is keyed under `nova:*` in `localStorage`. There is no remote
  backend — clearing site data wipes the workspace.
- Vite handles dev/build. The React Compiler is intentionally off (see comments
  in [`vite.config.js`](./vite.config.js)).
