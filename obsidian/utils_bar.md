# Utils bar

The top-of-content bar that hosts navigation utilities and the open-document
tabs. Implemented as `TabBar` in
[`src/shared/utils_bar.jsx`](../src/shared/utils_bar.jsx).

## Sections (left → right)

1. **Back** — disabled when `canBack` is false.
2. **Forward** — disabled when `canForward` is false.
3. **[[search]]** trigger — pill button that opens the ⌘K command palette.
   Width caps at `33%` of the bar / `340px`.
4. **Tab strip** — one tab per open doc. The active tab visually merges into
   the panel below by hiding its bottom border. Calendar tabs always render
   their label as `Calendar — <workspace name>`.

## Props

```js
TabBar({
  tabs, activeTabId, onSelect, onClose,
  getAppColor, activeWS,
  onSearchClick,                          // optional — hides the search pill if absent
  onBack, onForward, canBack, canForward, // optional — hides nav cluster if absent
})
```

## Where back / forward come from

Nav history is kept in `nova_base.jsx`:

- `navHist.stack` holds up to 50 `{ view, activeTabId }` entries.
- A `useEffect` watching `view` + `tabs.activeTabId` pushes new entries.
  Two changes within 150 ms collapse into one push so opening a doc does
  not produce two history points.
- `goBack` / `goForward` set a `navRestoring` ref so the restoring effect
  does not re-record the move.
