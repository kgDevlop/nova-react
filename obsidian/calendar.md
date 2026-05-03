# Calendar

`CalendarEditor` in [`src/apps/calendar.jsx`](../src/apps/calendar.jsx).

## Singleton semantics

Calendar is **the only app that is a workspace-wide singleton.**

- `useWSStore.createDoc("calendar", …)` is called *once* per workspace —
  `nova_base.jsx::openCalendarSingleton()` looks up an existing calendar
  doc before falling back to creation.
- It is filtered out of [[home]] doc listings (`_filterV` in
  [`shared/utils.jsx`](../src/shared/utils.jsx)).
- It is filtered out of [[new_doc_popup]] (`CREATABLE_APPS`).
- Its title in [[utils_bar]] tab strips and the editor top bar always
  renders as `Calendar — <workspace name>` and is not user-editable.

## State

| Field | Meaning |
|---|---|
| `view`     | One of `day` / `week` / `month` / `year`. Driven by the toolbar dropdown. |
| `cursor`   | A `Date` representing the active month/week/day. |
| `visible`  | `Set<calendarId>` controlling which sub-calendars contribute events. |

## Calendars

A static set lives at the top of the file:

```js
const CALENDARS = [
  { id: "work",   name: "Work",              color: "#4A8FE8" },
  { id: "ent",    name: "Entertainment",     color: "#EF4444" },
  ...
];
```

There is no add / remove flow yet. The right-side panel (rendered as the
calendar's own `AppsSidebar`, hence `OWNS_SIDEBAR` in
[`shell/shell.jsx`](../src/shell/shell.jsx)) shows this list with toggle
checkboxes and a mini-month navigator.

## Month grid

`buildMonthCells(year, month)` returns a 6 × 7 (= 42) array of day numbers
or `null` for padding cells. The grid never reflows — leading and trailing
nulls keep a stable shape across months.

## Open work

See [[issues]]. Notably:

- Day / Week / Year views still need rendering polish.
- Event creation + editing are stubbed.
