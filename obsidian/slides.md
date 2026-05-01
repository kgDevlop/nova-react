# Slides

`SlidesEditor` in [`src/apps/slides.jsx`](../src/apps/slides.jsx). An
SVG-backed presentation deck.

## Storage shape

```js
doc.content = JSON.stringify({
  slides: [
    { id, layout, theme, elements: [ { id, type, x, y, w, h, … } ] },
    ...
  ],
})
```

If parsing fails or the deck is empty, `_mkSlide` from
[`shared/canvas_utils.jsx`](../src/shared/canvas_utils.jsx) seeds a default
3-slide deck (`title`, `content`, `blank`) using `SLIDE_THEMES[0]`.

## Coordinate space

Logical canvas: `800 × 450` (16:9). Same pattern as [[draw]] — everything is
authored in this space and the rendered SVG handles scaling.

## Layouts

The `layout` toolbar dropdown switches a slide's structural template:

- `blank`   — empty
- `title`   — large centred title
- `content` — title + body
- `twocol`  — title + two columns

Layout changes are *templates*, not rules — once placed, elements live in
the slide's `elements[]` independently of the layout choice.

## Themes

`SLIDE_THEMES` (in `canvas_utils.jsx`) defines the colour packs available in
the toolbar's "Theme" dropdown: white, dark, minimal, bold, ocean, forest.

## Element types

| type        | Notes |
|---|---|
| `text`      | Default font size 18; minimum height 40 to keep selection handles legible. |
| `rect`      | Default stroke width 2. |
| `ellipse`   | Default stroke width 2. |
| `line`      | Stroke width 3 (visually weighted to read at distance). |

## Selection chrome

Selection rectangles use `SELECTION_COLOR = "#4A8FE8"` and a `4 2` dashed
stroke. `SelectionHandles` from `canvas_utils.jsx` renders the eight handles.
