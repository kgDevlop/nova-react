// _constants.js
//
// Centralized configuration constants for Nova.
//
// One bundle per consumer file (e.g. WriterConstants for writer.jsx).
// Shared data (APPS, TOOLBARS, SLIDE_THEMES, theme palettes) is defined
// privately once near the top, then referenced by every bundle that needs it.

import { I } from "./icons";

// ─── Shared base data ──────────────────────────────────────────────────────

const APPS = [
  { appId: "writer",   label: "Writer",   category: "Productivity",  Icon: I.FileText, defaultColor: "#4A8FE8", description: "Rich text documents",     status: "live" },
  { appId: "spreads",  label: "Spreads",  category: "Productivity",  Icon: I.Grid,     defaultColor: "#3BB580", description: "Spreadsheets & formulas", status: "live" },
  { appId: "slides",   label: "Slides",   category: "Productivity",  Icon: I.Monitor,  defaultColor: "#E87B3A", description: "Presentation decks",      status: "beta" },
  { appId: "draw",     label: "Draw",     category: "Productivity",  Icon: I.PenTool,  defaultColor: "#A87BE8", description: "Vector illustrations",    status: "live" },
  { appId: "calendar", label: "Calendar", category: "Communication", Icon: I.Calendar, defaultColor: "#84CC16", description: "Event scheduling",        status: "live" },
  { appId: "list",     label: "List",     category: "Productivity",  Icon: I.Checklist,defaultColor: "#14B8A6", description: "Indented to-do lists",    status: "live" },
];

const ACCENT_PRESETS = [
  { presetId: "gold",    hex: "#C8A253", softHex: "rgba(200,162,83,0.12)"   },
  { presetId: "violet",  hex: "#8B5CF6", softHex: "rgba(139,92,246,0.12)"   },
  { presetId: "teal",    hex: "#14B8A6", softHex: "rgba(20,184,166,0.12)"   },
  { presetId: "coral",   hex: "#F97316", softHex: "rgba(249,115,22,0.12)"   },
  { presetId: "rose",    hex: "#FB7185", softHex: "rgba(251,113,133,0.12)"  },
  { presetId: "sky",     hex: "#38BDF8", softHex: "rgba(56,189,248,0.12)"   },
  { presetId: "lime",    hex: "#84CC16", softHex: "rgba(132,204,22,0.12)"   },
  { presetId: "crimson", hex: "#EF4444", softHex: "rgba(239,68,68,0.12)"    },
];

const APP_COLORS = [
  "#4A8FE8", "#3BB580", "#E87B3A", "#A87BE8",
  "#F97316", "#14B8A6", "#FB7185", "#38BDF8",
  "#8B5CF6", "#EF4444", "#84CC16", "#F59E0B",
];

const COLOR_SCHEMES = [
  { schemeId: "classic", label: "Classic" },
  {
    schemeId: "bloodforge",
    label: "Bloodforge",
    palette: {
      bg: "#0A0202", surface: "#140505", surfaceShade: "#1A0808", surfaceAlt: "#1F0A0A", elevated: "#25100F",
      border: "#2A0F0F", borderStrong: "#4A1818",
      accent: "#C8A253", accentSoft: "rgba(200,162,83,0.14)",
      text: "#F0E0D0", textDim: "#B07060", textMuted: "#604040",
      isDark: true,
    },
    appColors: [
      "#C8A253", "#B22030", "#8B1A1A", "#D4732B",
      "#E8B860", "#7C2A1F", "#5C1810", "#A87060",
    ],
  },
  {
    schemeId: "parchment",
    label: "Old Parchment",
    palette: {
      bg: "#F2EDE0", surface: "#FFFFFF", surfaceShade: "#EDE8DC", surfaceAlt: "#E5DFD0", elevated: "#FFFFFF",
      border: "#D9D3C2", borderStrong: "#B8AE94",
      accent: "#4A8FE8", accentSoft: "rgba(74,143,232,0.12)",
      text: "#2A2418", textDim: "#6B5E40", textMuted: "#A89978",
      isDark: false,
    },
    appColors: [
      "#4A8FE8", "#6B5E40", "#B8AE94", "#8B7355",
      "#3BB580", "#5A8FB5", "#A89978", "#7B6F50",
    ],
  },
  {
    schemeId: "gunmetal",
    label: "Gunmetal",
    palette: {
      bg: "#050608", surface: "#0E1014", surfaceShade: "#14171C", surfaceAlt: "#1A1E24", elevated: "#20242C",
      border: "#2A2E36", borderStrong: "#3F4452",
      accent: "#C0C8D0", accentSoft: "rgba(192,200,208,0.10)",
      text: "#E8ECF0", textDim: "#8A92A0", textMuted: "#4E5460",
      isDark: true,
    },
    appColors: [
      "#C0C8D0", "#8A92A0", "#5A6478", "#9BA5B8",
      "#647288", "#3F4452", "#A8B0C0", "#7882A0",
    ],
  },
  {
    schemeId: "terminal",
    label: "Terminal",
    palette: {
      bg: "#000000", surface: "#050805", surfaceShade: "#080F08", surfaceAlt: "#0C140C", elevated: "#101A10",
      border: "#143618", borderStrong: "#2A6038",
      accent: "#00FF66", accentSoft: "rgba(0,255,102,0.12)",
      text: "#B8FFC8", textDim: "#5BC878", textMuted: "#2C6038",
      isDark: true,
    },
    appColors: [
      "#00FF66", "#5BC878", "#2A6038", "#00B855",
      "#7FE090", "#0F8A3A", "#3DAA50", "#88FF99",
    ],
  },
  {
    schemeId: "retrograde",
    label: "Retrograde",
    palette: {
      bg: "#0F0524", surface: "#1A0A38", surfaceShade: "#1F0E40", surfaceAlt: "#25124A", elevated: "#2C1858",
      border: "#3A1E70", borderStrong: "#5A2EAA",
      accent: "#FF4FC2", accentSoft: "rgba(255,79,194,0.14)",
      text: "#F0E0FF", textDim: "#00D5E5", textMuted: "#6A4090",
      isDark: true,
    },
    appColors: [
      "#FF4FC2", "#00D5E5", "#5A2EAA", "#A040D0",
      "#FF7AD0", "#3A1E70", "#8060FF", "#00A0C0",
    ],
  },
  {
    schemeId: "nocturne",
    label: "Nocturne",
    palette: {
      bg: "#060205", surface: "#100509", surfaceShade: "#15080D", surfaceAlt: "#1A0A11", elevated: "#200E16",
      border: "#2A101B", borderStrong: "#501830",
      accent: "#B22030", accentSoft: "rgba(178,32,48,0.14)",
      text: "#E8DCDC", textDim: "#B8B0B8", textMuted: "#58484E",
      isDark: true,
    },
    appColors: [
      "#B22030", "#B8B0B8", "#8B1A1A", "#702030",
      "#6F606A", "#A04030", "#8C7A82", "#5C1F2A",
    ],
  },
  {
    schemeId: "goldleaf",
    label: "Goldleaf",
    palette: {
      bg: "#0A0805", surface: "#14110A", surfaceShade: "#1A1610", surfaceAlt: "#1F1A12", elevated: "#25201A",
      border: "#2C2618", borderStrong: "#4F4426",
      accent: "#FFB800", accentSoft: "rgba(255,184,0,0.14)",
      text: "#F8E8C0", textDim: "#B89860", textMuted: "#5C4830",
      isDark: true,
    },
    appColors: [
      "#FFB800", "#B89860", "#8B6F40", "#C0A060",
      "#E8B100", "#F8E8C0", "#705028", "#FFD060",
    ],
  },
];

const SLIDE_THEMES = [
  { themeId: "white",   label: "White",   bg: "#FFFFFF", text: "#1A1A2E", accent: "#4A8FE8", heading: "#111118" },
  { themeId: "dark",    label: "Dark",    bg: "#1A1A2E", text: "#EAEAF2", accent: "#C8A253", heading: "#FFFFFF" },
  { themeId: "minimal", label: "Minimal", bg: "#F8F8F4", text: "#2A2A3A", accent: "#3BB580", heading: "#111118" },
  { themeId: "bold",    label: "Bold",    bg: "#E87B3A", text: "#FFFFFF", accent: "#FFFFFF", heading: "#FFFFFF" },
  { themeId: "ocean",   label: "Ocean",   bg: "#0F3460", text: "#E0E0F0", accent: "#38BDF8", heading: "#FFFFFF" },
  { themeId: "forest",  label: "Forest",  bg: "#2D5016", text: "#F0F4E8", accent: "#84CC16", heading: "#FFFFFF" },
];

const _btn    = (actionId, Icon, label) => ({ type: "btn",    actionId, Icon, label });
const _sep    = ()                      => ({ type: "sep"                            });
const _dd     = (actionId, label, opts) => ({ type: "dd",     actionId, label, opts });
const _spacer = ()                      => ({ type: "spacer"                         });

const TOOLBARS = {
  writer: [
    _dd("style", "Para", [
      { value: "p",    label: "Paragraph" },
      { value: "h1",   label: "Heading 1" },
      { value: "h2",   label: "Heading 2" },
      { value: "h3",   label: "Heading 3" },
      { value: "code", label: "Code block" },
    ]),
    _sep(),
    _btn("bold",      I.Bold,        "Bold"),
    _btn("italic",    I.Italic,      "Italic"),
    _btn("underline", I.Underline,   "Underline"),
    _sep(),
    _btn("alignL",    I.AlignLeft,   "Left"),
    _btn("alignC",    I.AlignCenter, "Center"),
    _btn("alignR",    I.AlignRight,  "Right"),
    _sep(),
    _btn("ul",        I.ListUl,      "Bullet list"),
    _btn("ol",        I.List,        "Numbered list"),
    _btn("bq",        I.Quote,       "Block quote"),
    _sep(),
    _btn("link",      I.Link2,       "Link"),
    _btn("img",       I.ImageIcon,   "Image"),
    _btn("tbl",       I.Table,       "Table"),
    _spacer(),
    _btn("full",      I.Maximize,    "Full screen"),
  ],
  spreads: [
    _dd("font", "Font", [
      { value: "def",  label: "Default"    },
      { value: "mono", label: "Monospace"  },
    ]),
    _sep(),
    _btn("bold",   I.Bold,        "Bold"),
    _btn("italic", I.Italic,      "Italic"),
    _sep(),
    _btn("dollar", I.Dollar,      "Currency"),
    _btn("pct",    I.Percent,     "Percent"),
    _sep(),
    _btn("aL",     I.AlignLeft,   "Left"),
    _btn("aC",     I.AlignCenter, "Center"),
    _btn("aR",     I.AlignRight,  "Right"),
    _sep(),
    _btn("border", I.BorderAll,   "Borders"),
    _spacer(),
    _btn("filter", I.Filter,      "Filter"),
    _btn("sort",   I.SortAsc,     "Sort"),
  ],
  slides: [
    _dd("layout", "Layout", [
      { value: "blank",   label: "Blank"      },
      { value: "title",   label: "Title"      },
      { value: "content", label: "Content"    },
      { value: "twocol",  label: "Two-column" },
    ]),
    _sep(),
    _btn("addText",    I.TypeT,   "Add text"),
    _btn("addRect",    I.Square,  "Add shape"),
    _btn("addEllipse", I.Globe,   "Add ellipse"),
    _sep(),
    _dd("theme", "Theme", [
      { value: "white",   label: "White"   },
      { value: "dark",    label: "Dark"    },
      { value: "minimal", label: "Minimal" },
      { value: "bold",    label: "Bold"    },
      { value: "ocean",   label: "Ocean"   },
      { value: "forest",  label: "Forest"  },
    ]),
    _sep(),
    _btn("dupSlide", I.Copy,  "Duplicate slide"),
    _btn("delSel",   I.Trash, "Delete element"),
    _spacer(),
    _btn("present",  I.Play,  "Present"),
  ],
  draw: [
    _btn("select",  I.ArrowR,  "Select (V)"),
    _sep(),
    _btn("rect",    I.Square,  "Rect (R)"),
    _btn("ellipse", I.Globe,   "Ellipse (E)"),
    _btn("line",    I.ArrowR,  "Line (L)"),
    _btn("text",    I.TypeT,   "Text (T)"),
    _btn("pen",     I.PenTool, "Pen (P)"),
    _sep(),
    _btn("delSel",  I.Trash,   "Delete"),
    _spacer(),
    _btn("export",  I.Upload,  "Export SVG"),
  ],
  list: [],
};

// ─── Per-consumer-file bundles ─────────────────────────────────────────────

export const WriterConstants = {
  PAPER_MAX_WIDTH:         816,
  PAPER_MIN_WIDTH:         320,
  PAGE_HEIGHT_RATIO:       11 / 8.5,
  MARGIN_TOP_RATIO:        0.83 / 8.5,
  MARGIN_BOTTOM_RATIO:     0.625 / 8.5,
  MARGIN_HORIZONTAL_RATIO: 0.875 / 8.5,
};

export const SpreadsConstants = {
  VISIBLE_COLS:     16,
  VISIBLE_ROWS:     60,
  ROW_HEADER_WIDTH: 44,
  COL_WIDTH:        96,
  ROW_HEIGHT:       24,
};

export const SlidesConstants = {
  CANVAS_WIDTH:              800,
  CANVAS_HEIGHT:             450,
  SELECTION_COLOR:           "#4A8FE8",
  SELECTION_DASH:            "4 2",
  DEFAULT_TEXT_FONT_SIZE:    18,
  DEFAULT_STROKE_WIDTH:      2,
  DEFAULT_LINE_STROKE_WIDTH: 3,
  TEXT_MIN_HEIGHT:           40,
  SLIDE_THEMES,
};

export const DrawConstants = {
  CANVAS_WIDTH:           1440,
  CANVAS_HEIGHT:          900,
  MIN_SHAPE_SIZE:         4,
  ZOOM_STEP:              0.25,
  ZOOM_MIN:               0.25,
  ZOOM_MAX:               3,
  DEFAULT_TEXT_WIDTH:     200,
  DEFAULT_TEXT_HEIGHT:    60,
  DEFAULT_TEXT_FONT_SIZE: 18,
  SELECTION_PAD:          3,
  TEXT_SELECTION_PAD:     2,
  DRAW_TOOLS: [
    { toolId: "select",  label: "Select",  Icon: I.ArrowR,  key: "V" },
    { toolId: "rect",    label: "Rect",    Icon: I.Square,  key: "R" },
    { toolId: "ellipse", label: "Ellipse", Icon: I.Globe,   key: "E" },
    { toolId: "line",    label: "Line",    Icon: I.ArrowR,  key: "L" },
    { toolId: "text",    label: "Text",    Icon: I.TypeT,   key: "T" },
    { toolId: "pen",     label: "Pen",     Icon: I.PenTool, key: "P" },
  ],
  CURSOR_BY_TOOL: {
    select:  "default",
    rect:    "crosshair",
    ellipse: "crosshair",
    line:    "crosshair",
    text:    "text",
    pen:     "crosshair",
  },
};

export const CalendarConstants = {
  CALENDARS: [
    { calId: "work",      name: "Work",      color: "#84CC16" },
    { calId: "lifestyle", name: "Lifestyle", color: "#2DD4BF" },
    { calId: "social",    name: "Social",    color: "#F87171" },
    { calId: "sleep",     name: "Sleep",     color: "#C084FC" },
    { calId: "personal",  name: "Personal",  color: "#60A5FA" },
  ],
  DAYS:      ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  DAYS_LONG: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  DAYS_MINI: ["S", "M", "T", "W", "T", "F", "S"],
  MONTHS:    [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
  VIEWS:       ["day", "week", "month", "year"],
  CELL_MIN_W:  130,
  CELL_MIN_H:  200,
  TODAY_BADGE: 22,
};

export const ListConstants = {
  MAX_DEPTH: 14,
  INDENT_PX: 22,
};

export const ShellConstants = {
  OWNS_SIDEBAR:        new Set(["calendar", "writer", "spreads"]),
  MOBILE_OWNS_TOOLBAR: new Set(["writer"]),
};

export const HomeConstants = {
  CARD_PREVIEW_BAR_WIDTHS: [70, 88, 52, 76, 38],
  GRID_MIN_CARD_PX:        200,
  GRID_COLS_KEY:           "nova.grid.docs.cols",
  APPS,
};

export const StoreConstants = {
  STORAGE_KEY:       "nova:workspaces:v1",
  ACTIVE_KEY:        "nova:active-ws:v1",
  ENABLED_BETAS_KEY: "nova:enabled-betas:v1",
  APP_COLORS_KEY:    "nova:app-colors:v1",
  WS_SEEDS: [
    { id: "ws-default", name: "Nova", emoji: "💥", color: "#C8A253", docs: [] },
  ],
};

export const NovaBaseConstants = {
  HIST_LIMIT:          50,
  MOBILE_DISABLED_KEY: "nova:mobile-disabled:v1",
};

export const ThemeConstants = {
  ACCENT_PRESETS,
  APP_COLORS,
  COLOR_SCHEMES,
  DEFAULT_THEME:      { mode: "dark", accentId: "gold", schemeId: "classic" },
  THEME_KEY:          "nova:theme:v1",
  CUSTOM_SCHEMES_KEY: "nova:custom-schemes:v1",
  APP_COLORS_KEY:     "nova:app-colors:v1",
  APPS,
};

export const AppsSidebarConstants = {
  OPEN_W:   248,
  CLOSED_W: 36,
  TOOLBARS,
};

export const ToolbarConstants = {
  TOOLBARS,
};

export const LeftSidebarConstants = {
  PRIMARY_NAV: [
    { viewId: "home",      label: "Home",      Icon: I.Home   },
    { viewId: "starred",   label: "Starred",   Icon: I.Star   },
    { viewId: "catalogue", label: "Catalogue", Icon: I.Layers },
  ],
  APPS,
};

export const NewDocPopupConstants = {
  CREATABLE_APPS: APPS.filter(a => a.appId !== "calendar"),
};

export const NewWSConstants = {
  EMOJIS: ["🏢", "⚡", "🎨", "🚀", "🌿", "🔬", "🎯", "📚", "🛠", "💡", "🌊", "🔥", "🎵", "🏆", "🐉", "🦋"],
};

export const NovaSettingsConstants = {
  COLOR_SCHEMES,
  APPS,
};

export const ShortcutsConstants = {
  SHORTCUTS: [
    ["⌘ K", "Command palette"],
    ["⌘ N", "New document"],
    ["Del", "Delete selected"],
    ["Esc", "Close / deselect"],
    ["Enter", "Confirm"],
    ["Tab", "Next cell (Spreads)"],
    ["F2", "Edit cell (Spreads)"],
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

export const PaletteConstants = {
  APPS,
};

export const UtilsConstants = {
  VIEW_TITLES: {
    home: "Home", starred: "Starred", catalogue: "Catalogue",
    writer: "Writer", spreads: "Spreads", slides: "Slides",
    draw: "Draw", forms: "Forms", pdf: "PDF",
    database: "Database", analytics: "Analytics", mail: "Mail",
    list: "List", whiteboard: "Whiteboard", video: "Video",
    code: "Code", api: "API",
  },
  APPS,
  SLIDE_THEMES,
};
