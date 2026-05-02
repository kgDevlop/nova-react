# Nova Office

GitHub Pages: https://kgdevlop.github.io/nova-react/

A local-first, offline-capable office suite. One workspace, six apps, no servers.
All documents live in your browser's storage and never leave the device unless
you explicitly export them.

```
npm install
npm run dev
```

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
  - [`obsidian/sheets.md`](./obsidian/sheets.md) — spreadsheet with formulas
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
  nova_base.jsx          NovaApp — top-level state, modal stack, nav history
  Nova.css               legacy splash styles (kept for the welcome route)
  shell/
    shell.jsx            AppShell — chrome wrapping every editor
    registry.js          APPS list (id / label / icon / default colour)
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
    utils.jsx            id / time / filter / sort helpers
    formulas.js          A1 ref parser + formula evaluator (used by Sheets)
    canvas_utils.jsx     SelectionHandles + slide theme helpers
    hooks/
      store.jsx          useWSStore, useTabs, useAutoSave, useAppColors
      system.jsx         useDeviceCaps, useKbd, useOut, useCanvasHistory
    modals/
      new_doc_popup.jsx  app-grid creation modal
      nova_settings.jsx  appearance + per-app colour panel
      palette.jsx        ⌘K command palette
      newws.jsx          new-workspace modal
      shortcuts.jsx      keyboard shortcuts cheatsheet
      types.ts           shared TypeScript types
  apps/
    writer.jsx           rich-text Writer
    spreads.jsx          Sheets — A1 grid + formulas
    slides.jsx           Slides — SVG-based deck
    draw.jsx             Draw — vector canvas
    list.jsx             List — indented to-dos
    calendar.jsx         Calendar — month/week/day views
```

## Conventions

- File and folder names use `_` as a word separator. Each editor file matches
  the id used in [`shell/registry.js`](./src/shell/registry.js) and the slug of
  its sibling note in [`obsidian/`](./obsidian).
- Persistence is keyed under `nova:*` in `localStorage`. There is no remote
  backend — clearing site data wipes the workspace.
- Vite handles dev/build. The React Compiler is intentionally off (see comments
  in [`vite.config.js`](./vite.config.js)).
