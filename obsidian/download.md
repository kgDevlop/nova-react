# Download

> **Status — not yet implemented.** Tracked in [[issues]].

Spec for the export-to-zip flow:

1. **Bulk download** — produce a single `.zip` containing every doc in the
   active workspace. Each app should serialise to a portable format:
   - Writer  → `.html` (or `.md` once a serialiser exists)
   - Sheets  → `.csv` per sheet
   - Slides  → `.svg` per slide, plus a manifest
   - Draw    → `.svg`
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
