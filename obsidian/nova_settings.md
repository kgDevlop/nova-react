# Nova settings

`SettingsPanel` in
[`src/shared/modals/nova_settings.jsx`](../src/shared/modals/nova_settings.jsx).
Two-pane modal: tabs on the left, a content scroller on the right.

## Tabs

### Appearance

- **Mode** — Dark / Light / System. Writes `theme.mode`. `system` is resolved
  against `prefers-color-scheme` once at render in
  [`shared/theme.tsx`](../src/shared/theme.tsx)'s `buildTokens` (no live
  listener; see the architecture comment at the top of the file).
- **Accent colour** — One of `ACCENT_PRESETS` (gold, violet, teal, coral,
  rose, sky, lime, crimson). Writes `theme.accentId`.

### App colours

For each app in [[app_list]], a row of:

- Resolved current colour (`AppChip`).
- 8-swatch palette from `APP_COLORS` for one-click overrides.
- Native `<input type="color">` for an arbitrary hex.
- Reset button (returns the app to its registry default `dc`).

Overrides are scoped to `(workspace_id, app_id)` and stored in the
`useAppColors` hook in [`shared/hooks/store.jsx`](../src/shared/hooks/store.jsx).
They are *not* persisted to `localStorage` today — they live for the session.

## Footer

A "Keyboard shortcuts" link at the bottom of every tab, which closes the
panel and opens `ShortcutsModal`.

## Roadmap (not yet implemented)

The original spec called for:

1. **Data** — change download location, default save interval, default zip
   name, toggle automatic downloads. See [[download]].
2. **Keyboard shortcuts** — view + edit. Currently view-only via the
   Shortcuts modal.
