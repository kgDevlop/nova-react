# New document popup

Modal launched from the "+ New document" affordance in the [[left_sidebar]],
the `New <App>` entries in the ⌘K palette, or the keyboard shortcut ⌘N.
Implementation: `NewDocModal` in
[`src/shared/modals/new_doc_popup.jsx`](../src/shared/modals/new_doc_popup.jsx).

## Layout

1. Header — "New document", subtitle, close button.
2. App grid — 4-column tile grid of `CREATABLE_APPS`. Calendar is filtered
   out because it is a workspace-wide singleton.
3. Footer — `AppChip` of the currently-selected type, an auto-named title
   input (placeholder = `<App> — <date>`), Cancel and Create buttons.

## Behaviour

- Auto-focuses the title input on open.
- `Enter` commits via `create()`, `Escape` cancels.
- `create()` is guarded by a `creating` flag so a double-Enter / double-click
  cannot fire `onCreate` twice before the modal has unmounted.
- The modal calls `getAppColor(activeWS.id, type, def.dc)` to seed the new
  doc's `appColor`, so colour overrides set in [[nova_settings]] flow
  through immediately.

## Inputs

```js
NewDocModal({
  onClose, onCreate,
  initType,        // optional preselected app id
  getAppColor, activeWS,
})
```
