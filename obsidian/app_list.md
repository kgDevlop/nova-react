# App list

What apps does Nova have?
Implemented as the `APPS` array in [`src/shell/registry.js`](../src/shell/registry.js).
The `_app(id)` helper resolves an id to its definition and falls back to the
first entry if the id is unknown.

```js
APPS = [
  { id, label, cat, Icon, dc, desc },
  ...
]
```

| Field | Meaning |
|---|---|
| `id`    | Stable kebab-less identifier. Also the file name in [`src/apps/`](../src/apps) and the slug of the corresponding obsidian note. |
| `label` | Display name. |
| `cat`   | Catalogue category (`"Productivity"`, `"Communication"`). Drives sectioning in [[app_catalogue]]. |
| `Icon`  | Reference into the icon set (`I.*` from [`shared/icons.tsx`](../src/shared/icons.tsx)). |
| `dc`    | Default colour. Workspace overrides land in `useAppColors`. |
| `desc`  | One-line description used by [[new_doc_popup]] and [[app_catalogue]]. |

## Live

| id         | File                                  | Note |
|---|---|---|
| `writer`   | [writer.jsx](../src/apps/writer.jsx)    | [[text_editor]] |
| `spreads`  | [spreads.jsx](../src/apps/spreads.jsx)  | [[spreads]] |
| `slides`   | [slides.jsx](../src/apps/slides.jsx)    | [[slides]] |
| `draw`     | [draw.jsx](../src/apps/draw.jsx)        | [[draw]] |
| `calendar` | [calendar.jsx](../src/apps/calendar.jsx)| [[calendar]] — workspace singleton |
| `list`     | [list.jsx](../src/apps/list.jsx)        | indented to-dos |

## Beta (planned, not yet wired)

- forms
- pdf
- mail
- video
- message

These have placeholder notes in [`obsidian/`](.) but no entries in `APPS` yet.
