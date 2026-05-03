# Left sidebar

Primary navigation rail. [`src/shared/left_sidebar.jsx`](../src/shared/left_sidebar.jsx)
exports three components:

| Component | When |
|---|---|
| `Sidebar`    | Desktop. Collapsible (`56px` ↔ `214px`). |
| `MobSidebar` | Mobile. Slides in over a backdrop, mirrors `Sidebar`. |
| `MobTopBar`  | Mobile. Hamburger + search field at the top of the screen. |

## Anatomy (top → bottom)

1. **Logo** + collapse toggle.
2. **Workspace switcher** (`WSSwitcher`) — emoji + name + doc count. Dropdown
   supports inline rename and a type-to-confirm `DeleteWSConfirm` (the user
   must type `Delete` to enable the destructive button).
3. **New document** primary button — opens [[new_doc_popup]] via `onNewDoc()`.
4. **Primary nav rows** — Home / Starred / All documents / Catalogue.
5. **Apps section** — every entry from [[app_list]] (`APPS` in `shell/registry.js`).
   Calendar is a singleton; clicking it routes through
   `openCalendarSingleton()` in `nova_base.jsx` rather than opening a list.
6. **Settings** at the bottom — opens [[nova_settings]].

## Props

```js
Sidebar({
  view, onNav, onNewDoc,
  collapsed, onToggle,
  ws, active, onSwitch, onNew, onRenameWS, onDeleteWS,
  onSettings,
})
```

`onNav(id)` switches `view`; selecting the active app id from this rail
clears the active tab so the home/list view re-mounts. The `WSSwitcher`
dropdown stays open while a delete-confirm modal is showing so dismissing
the modal doesn't blow away the surrounding list.
