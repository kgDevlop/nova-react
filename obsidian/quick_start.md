# Quick start

The chip row above the doc grid on [[home]]. Implementation lives inline in
`HomeScreen` ([`src/shell/home.jsx`](../src/shell/home.jsx)).

## Behaviour

- On the `home` view, every app from [[app_list]] is shown **except**
  `calendar` (which is a workspace-wide singleton, opened from the
  [[left_sidebar]] instead).
- When a single-app view is active (`view === "writer"`, etc.), only that app's
  chip is shown.
- For other views (`starred`, `all`) the row is omitted entirely.

Each chip is keyed by app id and styled with the resolved app color
(workspace override → `APPS[i].dc` default). Click → `onNewDoc(type)`.

## Source

```jsx
const qt = view === "home"
  ? APPS.filter(a => a.id !== "calendar").map(a => a.id)
  : APPS.some(a => a.id === view) ? [view] : null;
```
