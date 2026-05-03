# Home

`HomeScreen` in [`src/shell/home.jsx`](../src/shell/home.jsx). The default
view when no editor tab is active. It composes:

1. [[quick_start]] — app-launcher chips at the top
2. Filter / sort / view-mode toolbar (search, A→Z / type / modified, grid vs list, favourites toggle)
3. Document grid (`TileGrid`) or list (`DocRow`) with rename, star, delete

## Inputs

```js
HomeScreen({
  activeWS,       // workspace selector — provides .docs and .id
  view,           // "home" | "starred" | "all" | <appId>
  onOpen, onNewDoc, onStar, onDelete, onRename,
  getAppColor,    // (wsId, appId, fallback) => hex
})
```

`view` filters the doc list via `_filterV` in
[`shared/utils.jsx`](../src/shared/utils.jsx). Calendar docs are always
excluded from listings — they are only reachable through the [[left_sidebar]]
nav row.

## Grid sizing

Column count is user-controlled with a tick-stepped slider next to the
view-mode toggle. The maximum value is recomputed from the actual rendered
grid width via a `ResizeObserver`, floored at `GRID_MIN_CARD_PX = 150`. The
chosen column count is persisted to `localStorage` under
`nova.grid.docs.cols`.

## Empty state

If no docs match (`q` empty + workspace empty, or filtered to nothing), Home
shows a centred call-to-action with a "New document" button bound to
`onNewDoc(view)` when `view` is an app id, otherwise the all-apps modal.

## Related

- [[app_catalogue]] — the alternate "browse all apps" landing view in the
  same file (`AppCatalogueScreen`).
- [[issues]] — outstanding work for the home surface.
