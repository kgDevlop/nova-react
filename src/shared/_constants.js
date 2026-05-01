// _constants.js
//
// Centralized configuration constants for Nova.
//
// Constants are grouped by the source file they belong to (the file where
// they were originally defined). Each group is exported under the file's
// basename so a consumer only ever imports one name per source group:
//
//     import { writer } from "../shared/_constants";
//     ...writer.PAPER_MAX_WIDTH
//
// When a consumer file uses constants from multiple groups, it imports each
// group it needs (still one name per group).

import { I } from "./icons";

// ═══════════════════════════════════════════════════════════════════════════
// theme.jsx
// Used in: src/shared/theme.jsx, src/shared/modals/nova_settings.jsx,
//          src/shared/modals/newws.jsx
// ═══════════════════════════════════════════════════════════════════════════

export const theme = {
  // All available accent presets.
  ACCENT_PRESETS: [
    { id: "gold",    hex: "#C8A253", soft: "rgba(200,162,83,0.12)"   },
    { id: "violet",  hex: "#8B5CF6", soft: "rgba(139,92,246,0.12)"   },
    { id: "teal",    hex: "#14B8A6", soft: "rgba(20,184,166,0.12)"   },
    { id: "coral",   hex: "#F97316", soft: "rgba(249,115,22,0.12)"   },
    { id: "rose",    hex: "#FB7185", soft: "rgba(251,113,133,0.12)"  },
    { id: "sky",     hex: "#38BDF8", soft: "rgba(56,189,248,0.12)"   },
    { id: "lime",    hex: "#84CC16", soft: "rgba(132,204,22,0.12)"   },
    { id: "crimson", hex: "#EF4444", soft: "rgba(239,68,68,0.12)"    },
  ],

  // Generic color palette used for app-color overrides and workspace colors.
  APP_COLORS: [
    "#4A8FE8", "#3BB580", "#E87B3A", "#A87BE8",
    "#F97316", "#14B8A6", "#FB7185", "#38BDF8",
    "#8B5CF6", "#EF4444", "#84CC16", "#F59E0B",
  ],

  // Default theme config.
  DEFAULT_THEME: { mode: "dark", accentId: "gold" },
};

// ═══════════════════════════════════════════════════════════════════════════
// registry.js
// Used in: src/shell/registry.js, src/shell/home.jsx, src/shared/utils.jsx,
//          src/shared/atoms.jsx, src/shared/left_sidebar.jsx,
//          src/shared/modals/palette.jsx, src/shared/modals/nova_settings.jsx,
//          src/shared/modals/new_doc_popup.jsx
// ═══════════════════════════════════════════════════════════════════════════

const APPS = [
  {id:"writer",    label:"Writer",    cat:"Productivity", Icon:I.FileText, dc:"#4A8FE8",desc:"Rich text documents"},
  {id:"sheets",    label:"Sheets",    cat:"Productivity", Icon:I.Grid,     dc:"#3BB580",desc:"Spreadsheets & formulas"},
  {id:"slides",    label:"Slides",    cat:"Productivity", Icon:I.Monitor,  dc:"#E87B3A",desc:"Presentation decks"},
  {id:"draw",      label:"Draw",      cat:"Productivity", Icon:I.PenTool,  dc:"#A87BE8",desc:"Vector illustrations"},
  {id:"calendar",  label:"Calendar",  cat:"Communication",Icon:I.Calendar, dc:"#84CC16",desc:"Event scheduling"},
  {id:"list",      label:"List",      cat:"Productivity", Icon:I.Checklist,dc:"#14B8A6",desc:"Indented to-do lists"},
];

export const registry = { APPS };

// ═══════════════════════════════════════════════════════════════════════════
// canvas_utils.jsx
// Used in: src/shared/canvas_utils.jsx, src/apps/slides.jsx
// ═══════════════════════════════════════════════════════════════════════════

export const canvas_utils = {
  // Slide theme presets (background / text / accent / heading colors).
  SLIDE_THEMES: [
    { id: "white",   label: "White",   bg: "#FFFFFF", tx: "#1A1A2E", ac: "#4A8FE8", hd: "#111118" },
    { id: "dark",    label: "Dark",    bg: "#1A1A2E", tx: "#EAEAF2", ac: "#C8A253", hd: "#FFFFFF" },
    { id: "minimal", label: "Minimal", bg: "#F8F8F4", tx: "#2A2A3A", ac: "#3BB580", hd: "#111118" },
    { id: "bold",    label: "Bold",    bg: "#E87B3A", tx: "#FFFFFF", ac: "#FFFFFF", hd: "#FFFFFF" },
    { id: "ocean",   label: "Ocean",   bg: "#0F3460", tx: "#E0E0F0", ac: "#38BDF8", hd: "#FFFFFF" },
    { id: "forest",  label: "Forest",  bg: "#2D5016", tx: "#F0F4E8", ac: "#84CC16", hd: "#FFFFFF" },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// toolbar.jsx
// Used in: src/shared/toolbar.jsx
// (factory helpers below are private to this file)
// ═══════════════════════════════════════════════════════════════════════════

const _B = (id, Icon, label) => ({ type: "btn", id, Icon, label });
const _S = () => ({ type: "sep" });
const _DD = (id, label, opts) => ({ type: "dd", id, label, opts });
const _SP = () => ({ type: "spacer" });

export const toolbar = {
  TOOLBARS: {
    writer: [
      _DD("style", "Para", [
        { v: "p",    l: "Paragraph" },
        { v: "h1",   l: "Heading 1" },
        { v: "h2",   l: "Heading 2" },
        { v: "h3",   l: "Heading 3" },
        { v: "code", l: "Code block" },
      ]),
      _S(),
      _B("bold", I.Bold, "Bold"),
      _B("italic", I.Italic, "Italic"),
      _B("underline", I.Underline, "Underline"),
      _S(),
      _B("alignL", I.AlignLeft, "Left"),
      _B("alignC", I.AlignCenter, "Center"),
      _B("alignR", I.AlignRight, "Right"),
      _S(),
      _B("ul", I.ListUl, "Bullet list"),
      _B("ol", I.List, "Numbered list"),
      _B("bq", I.Quote, "Block quote"),
      _S(),
      _B("link", I.Link2, "Link"),
      _B("img", I.ImageIcon, "Image"),
      _B("tbl", I.Table, "Table"),
      _SP(),
      _B("full", I.Maximize, "Full screen"),
    ],
    sheets: [
      _DD("font", "Font", [
        { v: "def",  l: "Default" },
        { v: "mono", l: "Monospace" },
      ]),
      _S(),
      _B("bold", I.Bold, "Bold"),
      _B("italic", I.Italic, "Italic"),
      _S(),
      _B("dollar", I.Dollar, "Currency"),
      _B("pct", I.Percent, "Percent"),
      _S(),
      _B("aL", I.AlignLeft, "Left"),
      _B("aC", I.AlignCenter, "Center"),
      _B("aR", I.AlignRight, "Right"),
      _S(),
      _B("border", I.BorderAll, "Borders"),
      _SP(),
      _B("filter", I.Filter, "Filter"),
      _B("sort", I.SortAsc, "Sort"),
    ],
    slides: [
      _DD("layout", "Layout", [
        { v: "blank",   l: "Blank" },
        { v: "title",   l: "Title" },
        { v: "content", l: "Content" },
        { v: "twocol",  l: "Two-column" },
      ]),
      _S(),
      _B("addText", I.TypeT, "Add text"),
      _B("addRect", I.Square, "Add shape"),
      _B("addEllipse", I.Globe, "Add ellipse"),
      _S(),
      _DD("theme", "Theme", [
        { v: "white",   l: "White" },
        { v: "dark",    l: "Dark" },
        { v: "minimal", l: "Minimal" },
        { v: "bold",    l: "Bold" },
        { v: "ocean",   l: "Ocean" },
        { v: "forest",  l: "Forest" },
      ]),
      _S(),
      _B("dupSlide", I.Copy, "Duplicate slide"),
      _B("delSel", I.Trash, "Delete element"),
      _SP(),
      _B("present", I.Play, "Present"),
    ],
    draw: [
      _B("select", I.ArrowR, "Select (V)"),
      _S(),
      _B("rect", I.Square, "Rect (R)"),
      _B("ellipse", I.Globe, "Ellipse (E)"),
      _B("line", I.ArrowR, "Line (L)"),
      _B("text", I.TypeT, "Text (T)"),
      _B("pen", I.PenTool, "Pen (P)"),
      _S(),
      _B("delSel", I.Trash, "Delete"),
      _SP(),
      _B("export", I.Upload, "Export SVG"),
    ],
    list: [
      _B("addItem", I.Plus, "Add item"),
      _SP(),
      _B("clearDone", I.Trash, "Clear all done"),
    ],
    calendar: [
      _B("today", null, "Today"),
      _S(),
      _B("prev", I.ChevLeft, "Prev"),
      _B("next", I.ChevRight, "Next"),
      _S(),
      _DD("view", "Month", [
        { v: "day",   l: "Day" },
        { v: "week",  l: "Week" },
        { v: "month", l: "Month" },
        { v: "year",  l: "Year" },
      ]),
      _SP(),
      _B("new", I.Plus, "New event"),
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// apps_sidebar.jsx
// Used in: src/shared/apps_sidebar.jsx
// ═══════════════════════════════════════════════════════════════════════════

export const apps_sidebar = {
  OPEN_W: 248,
  CLOSED_W: 36,
};

// ═══════════════════════════════════════════════════════════════════════════
// shortcuts.jsx
// Used in: src/shared/modals/shortcuts.jsx
// ═══════════════════════════════════════════════════════════════════════════

export const shortcuts = {
  SHORTCUTS: [
    ["⌘ K", "Command palette"],
    ["⌘ N", "New document"],
    ["Del", "Delete selected"],
    ["Esc", "Close / deselect"],
    ["Enter", "Confirm"],
    ["Tab", "Next cell (Sheets)"],
    ["F2", "Edit cell (Sheets)"],
    ["V", "Select tool (Draw)"],
    ["R", "Rect (Draw)"],
    ["E", "Ellipse (Draw)"],
    ["L", "Line (Draw)"],
    ["T", "Text (Draw)"],
    ["P", "Pen (Draw)"],
    ["⌘ B", "Bold (Writer)"],
    ["⌘ I", "Italic (Writer)"],
    ["⌘ U", "Underline (Writer)"],
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// new_doc_popup.jsx
// Used in: src/shared/modals/new_doc_popup.jsx
// ═══════════════════════════════════════════════════════════════════════════

export const new_doc_popup = {
  // Apps creatable from the new-doc modal (calendar is a singleton).
  CREATABLE_APPS: APPS.filter(a => a.id !== "calendar"),
};

// ═══════════════════════════════════════════════════════════════════════════
// newws.jsx
// Used in: src/shared/modals/newws.jsx
// ═══════════════════════════════════════════════════════════════════════════

export const newws = {
  EMOJIS: ["🏢", "⚡", "🎨", "🚀", "🌿", "🔬", "🎯", "📚", "🛠", "💡", "🌊", "🔥", "🎵", "🏆", "🐉", "🦋"],
};

// ═══════════════════════════════════════════════════════════════════════════
// shell.jsx
// Used in: src/shell/shell.jsx
// ═══════════════════════════════════════════════════════════════════════════

export const shell = {
  // Per-app status-bar hint shown in the bottom-left of the editor chrome.
  LEFT_HINTS: {
    writer: "Click to format · Toolbar above",
    sheets: "Click a cell · Double-click to edit · = for formula",
    slides: "Click element to select · Drag to move · Double-click to edit text",
    draw: "Select (V) · Rect (R) · Ellipse (E) · Line (L) · Text (T) · Pen (P)",
    calendar: "Click a day to add event · Click event to edit",
    list: "Tab to indent · Enter to add · Click checkbox to mark done",
  },

  // Editors that render their own right-side panel and should suppress the
  // default AppsSidebar (e.g. calendar shows My Calendars + mini-month).
  OWNS_SIDEBAR: new Set(["calendar", "writer"]),

  // Editors that surface their toolbar inside the mobile drawer; the shell
  // suppresses the desktop ToolbarRow for these on mobile.
  MOBILE_OWNS_TOOLBAR: new Set(["writer"]),
};

// ═══════════════════════════════════════════════════════════════════════════
// home.jsx
// Used in: src/shell/home.jsx
// ═══════════════════════════════════════════════════════════════════════════

export const home = {
  // Widths for fake content lines in the doc preview tile.
  CARD_PREVIEW_BAR_WIDTHS: [70, 88, 52, 76, 38],
  // Minimum pixel width per card in the doc grid.
  GRID_MIN_CARD_PX: 150,
  // localStorage key for the grid column-count preference.
  GRID_COLS_KEY: "nova.grid.docs.cols",
};

// ═══════════════════════════════════════════════════════════════════════════
// utils.jsx
// Used in: src/shared/utils.jsx
// ═══════════════════════════════════════════════════════════════════════════

export const utils = {
  // Map of view id to display title (for _vtitle).
  VIEW_TITLES: {
    home: "Home",
    starred: "Starred",
    all: "All documents",
    catalogue: "App catalogue",
    writer: "Writer",
    sheets: "Sheets",
    slides: "Slides",
    draw: "Draw",
    forms: "Forms",
    pdf: "PDF",
    database: "Database",
    analytics: "Analytics",
    mail: "Mail",
    list: "List",
    whiteboard: "Whiteboard",
    video: "Video",
    code: "Code",
    api: "API",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// left_sidebar.jsx
// Used in: src/shared/left_sidebar.jsx
// ═══════════════════════════════════════════════════════════════════════════

export const left_sidebar = {
  PRIMARY_NAV: [
    { id: "home", l: "Home", I: I.Home },
    { id: "starred", l: "Starred", I: I.Star },
    { id: "all", l: "All documents", I: I.Folder },
    { id: "catalogue", l: "App catalogue", I: I.Layers },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// nova_base.jsx
// Used in: src/nova_base.jsx
// ═══════════════════════════════════════════════════════════════════════════

export const nova_base = {
  // Max history stack size for back/forward page navigation.
  HIST_LIMIT: 50,
  // localStorage key for the "disable mobile site" preference. When true, the
  // viewport-width mobile detection is overridden and the desktop layout is
  // forced even on small screens.
  MOBILE_DISABLED_KEY: "nova:mobile-disabled:v1",
};

// ═══════════════════════════════════════════════════════════════════════════
// store.jsx (hooks/store.jsx)
// Used in: src/shared/hooks/store.jsx
// ═══════════════════════════════════════════════════════════════════════════

export const store = {
  STORAGE_KEY: "nova:workspaces:v1",
  ACTIVE_KEY: "nova:active-ws:v1",
  // Default workspace seed shown on first load.
  WS_SEEDS: [
    { id: "ws-default", name: "Nova", emoji: "💥", color: "#C8A253", docs: [] },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// writer.jsx
// Used in: src/apps/writer.jsx
// ═══════════════════════════════════════════════════════════════════════════

export const writer = {
  PAPER_MAX_WIDTH: 816,
  PAPER_MIN_WIDTH: 320,
  PAGE_HEIGHT_RATIO: 11 / 8.5,
  MARGIN_TOP_RATIO: 0.83 / 8.5,
  MARGIN_BOTTOM_RATIO: 0.625 / 8.5,
  MARGIN_HORIZONTAL_RATIO: 0.875 / 8.5,
};

// ═══════════════════════════════════════════════════════════════════════════
// spreads.jsx
// Used in: src/apps/spreads.jsx
// ═══════════════════════════════════════════════════════════════════════════

export const spreads = {
  VISIBLE_COLS: 16,
  VISIBLE_ROWS: 60,
  ROW_HEADER_WIDTH: 44,
  COL_WIDTH: 96,
  ROW_HEIGHT: 24,
};

// ═══════════════════════════════════════════════════════════════════════════
// slides.jsx
// Used in: src/apps/slides.jsx
// ═══════════════════════════════════════════════════════════════════════════

export const slides = {
  // Logical canvas dimensions — every coordinate stored on a slide element is
  // expressed in this space, then scaled to the rendered SVG viewport.
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 450,

  // Selection chrome.
  SELECTION_COLOR: "#4A8FE8",
  SELECTION_DASH: "4 2",

  // Default geometry / styling for newly-inserted elements.
  DEFAULT_TEXT_FONT_SIZE: 18,
  DEFAULT_STROKE_WIDTH: 2,
  DEFAULT_LINE_STROKE_WIDTH: 3,
  TEXT_MIN_HEIGHT: 40,
};

// ═══════════════════════════════════════════════════════════════════════════
// draw.jsx
// Used in: src/apps/draw.jsx
// ═══════════════════════════════════════════════════════════════════════════

export const draw = {
  // Fixed virtual coordinate space; the rendered SVG is scaled via CSS
  // transform for zoom, so element coordinates remain stable.
  CANVAS_WIDTH: 1440,
  CANVAS_HEIGHT: 900,

  // Minimum drag distance (in canvas units) before a shape is committed —
  // prevents accidental tiny shapes from a click without drag.
  MIN_SHAPE_SIZE: 4,

  // Zoom step + bounds for the +/− buttons.
  ZOOM_STEP: 0.25,
  ZOOM_MIN: 0.25,
  ZOOM_MAX: 3,

  // Default text-element dimensions when the user clicks the text tool.
  DEFAULT_TEXT_WIDTH: 200,
  DEFAULT_TEXT_HEIGHT: 60,
  DEFAULT_TEXT_FONT_SIZE: 18,

  // Selection outline padding (canvas units around the bounding box).
  SELECTION_PAD: 3,
  TEXT_SELECTION_PAD: 2,

  // Drawing tool definitions.
  DRAW_TOOLS: [
    { id: "select",  label: "Select",  Icon: I.ArrowR,  key: "V" },
    { id: "rect",    label: "Rect",    Icon: I.Square,  key: "R" },
    { id: "ellipse", label: "Ellipse", Icon: I.Globe,   key: "E" },
    { id: "line",    label: "Line",    Icon: I.ArrowR,  key: "L" },
    { id: "text",    label: "Text",    Icon: I.TypeT,   key: "T" },
    { id: "pen",     label: "Pen",     Icon: I.PenTool, key: "P" },
  ],

  // Cursor shown over the canvas background for each tool.
  CURSOR_BY_TOOL: {
    select: "default",
    rect: "crosshair",
    ellipse: "crosshair",
    line: "crosshair",
    text: "text",
    pen: "crosshair",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// calendar.jsx
// Used in: src/apps/calendar.jsx
// ═══════════════════════════════════════════════════════════════════════════

export const calendar = {
  // Static calendar list — singleton calendar app, no add/remove.
  CALENDARS: [
    { id: "work",   name: "Work",              color: "#4A8FE8" },
    { id: "ent",    name: "Entertainment",     color: "#EF4444" },
    { id: "agenda", name: "Agenda",            color: "#F59E0B" },
    { id: "appts",  name: "Appointments",      color: "#3BB580" },
    { id: "proj",   name: "Personal Projects", color: "#A87BE8" },
    { id: "health", name: "Healthy",           color: "#FACC15" },
  ],

  DAYS:      ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  DAYS_MINI: ["S", "M", "T", "W", "T", "F", "S"],
  MONTHS:    [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
  VIEWS:       ["day", "week", "month", "year"],
  CELL_MIN_H:  90,
  TODAY_BADGE: 22,
};

// ═══════════════════════════════════════════════════════════════════════════
// list.jsx
// Used in: src/apps/list.jsx
// ═══════════════════════════════════════════════════════════════════════════

export const list = {
  // Tree depth cap (15 levels: root + 14 nested children).
  MAX_DEPTH: 14,
  // Indentation pixels per depth level.
  INDENT_PX: 22,
};
