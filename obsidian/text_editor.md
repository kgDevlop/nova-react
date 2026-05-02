# Text editor

Nova exposes three text-editing surfaces. They share the same formatting
verbs but each surface presents a different subset.

## Implementation

- **Toolbar registry** — [`src/shared/toolbar.jsx`](../src/shared/toolbar.jsx).
  `TOOLBARS` maps `appId → ToolbarItem[]`; `ToolbarRow` renders the strip.
  Items are one of `btn`, `dd` (dropdown), `sep`, `spacer`, `label`.
- **Per-app wiring** — each editor calls `registerActions(fn)` on mount and
  `AppShell` ([`src/shell/shell.jsx`](../src/shell/shell.jsx)) routes
  toolbar `id`s to that callback. The shell never reads editor state — only
  the editor handles what its action ids mean.

## Surfaces

### 1. Inline popup (selection toolbar)

Shown over a text selection in the Writer canvas. Style cluster only.

- Style: Font, Color, Highlight, **Bold**, *Italics*, ~~Strikethrough~~, Underline
- Superscript / Subscript
- Format

### 2. Half-size strip (Sheets)

Top-of-content row inside the Sheets editor. Cell-level formatting.

- Style: Font, Color, Highlight, Bold, Strikethrough
- List: numbers, bullets, solid points, hollow points, custom SVG upload
- Hyperlink, Insert image, Table, Code

### 3. Full-screen ribbon (Writer)

Document-level formatting in the Writer toolbar.

- **Format** — Paragraph (default), H1, H2, H3, H4
- Style: Bold, Italics, Underlined, Strikethrough, Superscript, Subscript
- Bullet list: numbers (default), bullets, solid points, hollow points,
  custom SVG upload
- Block quote
- Hyperlink, Insert image, Table, Code block

## Where to add a new control

1. Add a `_B` / `_DD` entry to the relevant `TOOLBARS[appId]` array.
2. Handle the action's `id` inside the editor's `registerActions` callback.
3. If the control needs a new icon, add it to
   [`shared/icons.tsx`](../src/shared/icons.tsx) and reference via `I.<Name>`.
