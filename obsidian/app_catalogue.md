# App catalogue

The full-screen app browser. `AppCatalogueScreen` in
[`src/shell/home.jsx`](../src/shell/home.jsx). Reachable from the
[[left_sidebar]] ("App catalogue" row) and from the ⌘K palette
("App catalogue" nav entry).

## Composition

- For every distinct `cat` in [[app_list]] (`Productivity`, `Communication`),
  render a section header.
- Inside each section, a `TileGrid` (auto-fill, `min: 210px`) of app cards.
- Each card shows a "Live" badge, the app icon tinted with its current
  resolved colour, the label, and `desc`.
- Click → `onNewDoc(app.id)`. Calendar tiles open the singleton calendar
  through `nova_base.jsx`'s `openCalendarSingleton`.

## Inputs

```js
AppCatalogueScreen({
  onNewDoc,    // (appId) => void
  getAppColor, // (wsId, appId, fallback) => hex
  activeWS,    // current workspace
})
```

## Related

- [[home]] — the doc-grid alternative landing view.
- [[new_doc_popup]] — the smaller modal-flavoured app picker.
- [[issues]] — open work items for this surface.
