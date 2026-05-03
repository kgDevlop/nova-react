// registry.js
//
// Maps each app id to the React component that renders its editor canvas.
// App metadata (id, label, icon, default colour, description) lives in
// src/shared/_constants.js under `registry.APPS`.
//
// To add a new app:
//   1. Add an entry to `registry.APPS` in src/shared/_constants.js
//   2. Add the component mapping here
//   3. Create src/apps/<id>.jsx

import { WriterEditor }   from "../apps/writer";
import { SpreadsEditor }  from "../apps/spreads";
import { SlidesEditor }   from "../apps/slides";
import { DrawEditor }     from "../apps/draw";
import { CalendarEditor } from "../apps/calendar/calendar";
import { ListEditor }     from "../apps/list";

const EDITORS = {
  writer:   WriterEditor,
  spreads:  SpreadsEditor,
  slides:   SlidesEditor,
  draw:     DrawEditor,
  calendar: CalendarEditor,
  list:     ListEditor,
};

export const editorFor = (id) => EDITORS[id] ?? null;
