# Download

> **Status — not yet implemented.** Tracked in [[issues]].

Spec for the export-to-zip flow:

1. **Bulk download** — produce a single folder containing every document in every workspace. Defaulted to the primary file type used to display data in Nova.
   - Writer  → '.html', '.png'
   - Spreads → `.csv`, '.png'
   - Slides  → `.svg`, (folder of) '.png'
   - Draw    → (folder of) `.svg` by layer, '.png' no layers
   - List    → `.json`
   - Calendar → `.ics`
2. **Default download location** — surfaced in [[nova_settings]] under "Data".
3. **Auto-downloads** — interval-based snapshot to the chosen location;
   pairs with the existing `useAutoSave` debounce in
   [`shared/hooks/store.jsx`](../src/shared/hooks/store.jsx).

## Open questions

- File-System Access API vs `<a download>` blob. The latter is the path of
  least resistance but cannot honour a user-chosen output directory across
  sessions.
- How to namespace the zip's directory tree — by workspace, by app, or by
  modified date?
