# Draw

`DrawEditor` in [`src/apps/draw.jsx`](../src/apps/draw.jsx). A vector
illustration canvas backed by SVG.

## Coordinate space

The canvas is a fixed virtual `1440 × 900` (`CANVAS_WIDTH` / `CANVAS_HEIGHT`).
Every element stores its geometry in those units; zoom is applied via CSS
transform on the SVG so element coordinates remain stable across zoom levels.

## Tools

`DRAW_TOOLS` enumerates the palette:

| id        | Hotkey | Note |
|---|---|---|
| `select`  | V | Click / marquee — uses `SelectionHandles` from [`shared/canvas_utils.jsx`](../src/shared/canvas_utils.jsx). |
| `rect`    | R | Click-drag. Discards drags shorter than `MIN_SHAPE_SIZE = 4`. |
| `ellipse` | E | Same as rect with an elliptical shape. |
| `line`    | L | Two-point line. |
| `text`    | T | Click drops a `200 × 60` text element with `font-size: 18`. |
| `pen`     | P | Free-hand path. |

The toolbar config in [`shared/toolbar.jsx`](../src/shared/toolbar.jsx)
mirrors this list; `id`s match.

## Zoom

`ZOOM_STEP = 0.25`, range `[0.25, 3]`. The +/− controls live in the bottom
status bar (`StatusBar` in [`shared/topbar.jsx`](../src/shared/topbar.jsx))
and are only visible because `AppShell` flags `showZoom` for `doc.type === "draw"`.

## Element ids

`generateElementId()` (re-exported as `_elId` from
[`shared/utils.jsx`](../src/shared/utils.jsx)) returns a 6-char base-36
string. Collision risk is acceptable for per-doc element counts.

## Export

The "Export SVG" toolbar button (`export` action id) serialises the canvas
to a downloadable SVG file. See also [[download]] for the broader bulk
export design.
