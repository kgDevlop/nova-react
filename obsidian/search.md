# Search

Universal search is the ⌘K **command palette**:
`CommandPalette` in [`src/shared/modals/palette.jsx`](../src/shared/modals/palette.jsx).
It is the *only* search surface in Nova — there is no separate full-text
results page.

Triggered from:

- The pill button in [[utils_bar]] (`onSearchClick`).
- The ⌘K shortcut anywhere (`useKbd("k")` in `nova_base.jsx`).

## Result groups

The palette merges three sources, then ranks by `score(label, query)`:

| Group | Entries |
|---|---|
| **Recent** | `docs.slice(0, 80)` from the active workspace, mapped to "Open <title>" rows. Calendar is included; everything else uses the doc's actual title. |
| **Create** | One entry per app from [[app_list]]. Calendar reads `Open Calendar` because it is a singleton. |
| **Navigate** | Home, Starred, All documents, [[app_catalogue]], [[nova_settings]], Keyboard shortcuts. |

`score` returns 100 for an exact label match, 80 for a prefix match, 50 for
substring. With no query, the palette shows the first 5 of each plus all nav
commands. With a query, results are filtered to score > 0 and capped at 14.

## Keyboard

- `↑` / `↓` move the selection (`sel`).
- `Enter` runs the highlighted entry's `action()`.
- `Escape` or click outside closes the modal.
