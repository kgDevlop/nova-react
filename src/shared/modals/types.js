/**
 * @fileoverview Canonical type definitions for Nova Office.
 * All modules import types from here — never redefine inline.
 *
 * Conventions
 * -----------
 * - Use JSDoc @typedef so editors provide autocomplete without a build step.
 * - Primitive unions are string literals (ThemeMode, AccentId, AppId).
 * - Object shapes use @typedef {Object} + @property per field.
 * - Collections alias their element type: CellMap, SlideElementMap, etc.
 * - Editor-specific content shapes live at the bottom under "Editor Content".
 */

// ─── Primitives ──────────────────────────────────────────────────────────────

/** @typedef {'dark'|'light'|'system'} ThemeMode */

/** @typedef {'gold'|'violet'|'teal'|'coral'|'rose'|'sky'|'lime'|'crimson'} AccentId */

/**
 * Every app identifier in the suite. Extend here when adding new apps.
 * @typedef {'writer'|'spreads'|'slides'|'draw'|'forms'|'pdf'|
 *            'database'|'analytics'|'mail'|'calendar'|
 *            'whiteboard'|'video'|'code'|'api'} AppId
 */

/** @typedef {'Productivity'|'Data'|'Communication'|'Creative'|'Developer'} AppCategory */

/** @typedef {'idle'|'saving'|'saved'} SaveStatus */

/** @typedef {'success'|'error'|'warning'|'info'} NotifType */

/** @typedef {'left'|'center'|'right'} TextAlign */

// ─── Theme ───────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} AccentPreset
 * @property {AccentId} presetId
 * @property {string}   hex      - e.g. "#C8A253"
 * @property {string}   softHex  - e.g. "rgba(200,162,83,0.12)"
 */

/**
 * Raw theme config stored in state — not the computed token object.
 * @typedef {Object} ThemeConfig
 * @property {ThemeMode} mode
 * @property {AccentId}  accentId
 */

/**
 * The computed design token object returned by useT().
 * @typedef {Object} TokenObject
 * @property {string}  bg            - Page background
 * @property {string}  surface       - Card / panel background
 * @property {string}  surfaceShade  - Hover background
 * @property {string}  surfaceAlt    - Active / selected background
 * @property {string}  elevated      - Elevated surface (modals, tooltips)
 * @property {string}  border        - Default border
 * @property {string}  borderStrong  - Strong / focus border
 * @property {string}  accent        - Accent hex
 * @property {string}  accentSoft    - Accent soft rgba
 * @property {string}  text          - Primary text
 * @property {string}  textDim       - Secondary text
 * @property {string}  textMuted     - Muted / placeholder text
 * @property {string}  error         - Error / destructive (#E85252)
 * @property {string}  r6            - Border radius 6 px
 * @property {string}  r10           - Border radius 10 px
 * @property {string}  r14           - Border radius 14 px
 * @property {string}  r20           - Border radius 20 px
 * @property {string}  rF            - Fully rounded (9999 px)
 * @property {string}  fontFamily    - Font-family string
 * @property {string}  transition    - CSS transition string
 * @property {boolean} isDark        - True when in dark mode
 */

// ─── App Registry ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} AppDef
 * @property {AppId}                              appId
 * @property {string}                             label
 * @property {AppCategory}                        category
 * @property {React.ComponentType<IconProps>}     Icon
 * @property {string}                             defaultColor  - Default color hex
 * @property {string}                             description   - One-line description
 */

// ─── Workspace & Documents ───────────────────────────────────────────────────

/**
 * A single document in a workspace.
 * `content` is an opaque string (HTML for writer, JSON for everything else).
 * @typedef {Object} NovaDoc
 * @property {string}  id
 * @property {string}  title
 * @property {AppId}   type
 * @property {Date}    created
 * @property {Date}    modified
 * @property {boolean} starred
 * @property {string}  content
 * @property {string}  [appColor] - Per-doc color override
 */

/**
 * @typedef {Object} Workspace
 * @property {string}            id
 * @property {string}            name
 * @property {string}            emoji
 * @property {string}            color    - Workspace accent hex
 * @property {NovaDoc[]}         docs
 */

// ─── UI Atoms ────────────────────────────────────────────────────────────────

/**
 * Base props accepted by every icon component.
 * @typedef {Object} IconProps
 * @property {number}                [size=16]
 * @property {string}                [color="currentColor"]
 * @property {string}                [fill="none"]
 * @property {number}                [sw=2]       - strokeWidth
 * @property {React.CSSProperties}  [style]
 */

/**
 * A tab entry mirrors a NovaDoc but may hold stale title while renaming.
 * @typedef {Object} TabEntry
 * @property {string}  id
 * @property {string}  title
 * @property {AppId}   type
 * @property {string}  content
 * @property {boolean} starred
 * @property {string}  [appColor]
 */

/**
 * @typedef {Object} Notification
 * @property {string}     id
 * @property {NotifType}  type
 * @property {string}     msg
 */

// ─── Toolbar System ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} ToolbarDropdownOption
 * @property {string} value
 * @property {string} label
 */

/**
 * Discriminated union for toolbar items.
 * Use the `type` field to narrow before accessing other properties.
 *
 * @typedef {Object} ToolbarItemBtn
 * @property {'btn'}                              type
 * @property {string}                             actionId
 * @property {React.ComponentType<IconProps>|null} Icon
 * @property {string}                             label
 *
 * @typedef {Object} ToolbarItemDropdown
 * @property {'dd'}                               type
 * @property {string}                             actionId
 * @property {string}                             label
 * @property {ToolbarDropdownOption[]}            opts
 *
 * @typedef {Object} ToolbarItemSep
 * @property {'sep'} type
 *
 * @typedef {Object} ToolbarItemSpacer
 * @property {'spacer'} type
 *
 * @typedef {Object} ToolbarItemLabel
 * @property {'label'} type
 * @property {string}  text
 *
 * @typedef {ToolbarItemBtn|ToolbarItemDropdown|ToolbarItemSep|ToolbarItemSpacer|ToolbarItemLabel} ToolbarItem
 */

// ─── Editor Content Shapes ───────────────────────────────────────────────────

// Spreads ─────────────────────────────────────────────────────────────────────

/**
 * A single spreadsheet cell.
 * `raw`  = what the user typed (may be a formula like "=SUM(A1:A5)").
 * `display` = the computed display string, set after formula evaluation.
 * @typedef {Object} CellData
 * @property {string}     raw
 * @property {string}     [fmt]     - '$' | 'pct'
 * @property {boolean}    [bold]
 * @property {boolean}    [italic]
 * @property {TextAlign}  [align]
 * @property {string}     [display] - post-eval cached value
 */

/** @typedef {{ [cellKey: string]: CellData }} CellMap */

// Slides / Draw ───────────────────────────────────────────────────────────────

/**
 * @typedef {Object} PenPoint
 * @property {number} x
 * @property {number} y
 */

/**
 * A single element on a slide or draw canvas.
 * Lines use x1/y1/x2/y2; all others use x/y/w/h.
 * Pen elements use pts[] instead.
 * @typedef {Object} CanvasElement
 * @property {string}  id
 * @property {'text'|'rect'|'ellipse'|'line'|'pen'} type
 * @property {number}  [x]       @property {number}  [y]
 * @property {number}  [w]       @property {number}  [h]
 * @property {number}  [x1]      @property {number}  [y1]
 * @property {number}  [x2]      @property {number}  [y2]
 * @property {PenPoint[]} [pts]
 * @property {string}  [text]
 * @property {number}  [fontSize]
 * @property {boolean} [bold]
 * @property {string}  [color]
 * @property {TextAlign} [align]
 * @property {boolean} [placeholder]
 * @property {string}  [fill]
 * @property {string}  [stroke]
 * @property {number}  [strokeW]
 * @property {number}  [rx]
 */

/**
 * @typedef {Object} SlideTheme
 * @property {string} themeId
 * @property {string} label
 * @property {string} bg
 * @property {string} text
 * @property {string} accent
 * @property {string} heading
 */

/**
 * @typedef {Object} Slide
 * @property {string}  id
 * @property {'blank'|'title'|'content'|'twocol'} layout
 * @property {string}  bg
 * @property {CanvasElement[]} elements
 */

// Forms ───────────────────────────────────────────────────────────────────────

/**
 * @typedef {'text'|'long'|'number'|'email'|'select'|'check'|'date'|'rating'} FieldType
 */

/**
 * @typedef {Object} FormField
 * @property {string}    id
 * @property {FieldType} type
 * @property {string}    label
 * @property {boolean}   required
 * @property {string[]}  options  - Used by 'select' type only
 */

/**
 * @typedef {Object} FormResponse
 * @property {string}                  id
 * @property {string}                  timestamp
 * @property {{ [fieldId: string]: any }} data
 */

// Database ────────────────────────────────────────────────────────────────────

/**
 * @typedef {'Text'|'Number'|'Select'|'Date'|'Checkbox'|'URL'} DBFieldType
 */

/**
 * @typedef {Object} DBField
 * @property {string}      id
 * @property {string}      name
 * @property {DBFieldType} type
 * @property {string[]}    [options]
 */

/**
 * @typedef {{ [fieldId: string]: string | boolean }} DBRecord
 * @typedef {DBRecord & { id: string }} DBRecordWithId
 */

// Analytics ───────────────────────────────────────────────────────────────────

/**
 * @typedef {'bar'|'line'|'pie'|'stat'} WidgetType
 */

/**
 * @typedef {Object} AnalyticsWidget
 * @property {string}     id
 * @property {WidgetType} type
 * @property {string}     [title]
 * @property {number[]}   [data]
 * @property {string[]}   [labels]
 * @property {string}     [label]  - stat card label
 * @property {string}     [value]  - stat card display value
 * @property {string}     [delta]
 * @property {boolean}    [up]
 */

// Mail ────────────────────────────────────────────────────────────────────────

/**
 * @typedef {'inbox'|'sent'|'drafts'|'trash'} MailFolder
 */

/**
 * @typedef {Object} MailThread
 * @property {string}     id
 * @property {string}     from
 * @property {string}     email
 * @property {string}     sub
 * @property {string}     prev
 * @property {string}     time
 * @property {boolean}    unread
 * @property {boolean}    starred
 * @property {MailFolder} folder
 * @property {string}     body
 */

// Calendar ────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} CalEvent
 * @property {string} id
 * @property {string} title
 * @property {string} start  - ISO 8601
 * @property {string} end    - ISO 8601
 * @property {string} color
 * @property {string} [notes]
 */

// Whiteboard ──────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Sticky
 * @property {string} id
 * @property {number} x  @property {number} y
 * @property {number} w  @property {number} h
 * @property {string} text
 * @property {string} color
 */

/**
 * @typedef {Object} Connector
 * @property {string} id
 * @property {string} from  - Sticky id
 * @property {string} to    - Sticky id
 */

// Code ────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} CodeFile
 * @property {string} id
 * @property {string} name
 * @property {string} lang
 * @property {string} content
 */

/**
 * @typedef {Object} ConsoleEntry
 * @property {'log'|'error'|'warn'|'success'} type
 * @property {string} text
 */

// API Client ──────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} KVPair
 * @property {string} k
 * @property {string} v
 */

/**
 * @typedef {Object} ApiHistoryEntry
 * @property {string} id
 * @property {string} url
 * @property {number} status
 * @property {number} ms
 * @property {string} time
 */

/**
 * @typedef {Object} ApiResponse
 * @property {number}  [status]
 * @property {string}  [statusText]
 * @property {any}     [body]
 * @property {string}  [rawBody]
 * @property {{ [k: string]: string }} [headers]
 * @property {number}  [ms]
 * @property {string}  [size]
 * @property {string}  [error]
 */

// ─── Editor Base Props ───────────────────────────────────────────────────────

/**
 * Props passed to every editor component by AppShell.
 * All editors must accept this exact shape.
 * @typedef {Object} EditorProps
 * @property {string}   appColor
 * @property {NovaDoc}  doc
 * @property {TokenObject} t
 * @property {(content: string) => void} onContentChange
 * @property {(handler: (id: string, val?: string) => void) => void} registerActions
 */

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} WSStore
 * @property {Workspace[]}  ws
 * @property {Workspace}    active
 * @property {(id: string) => void} setActiveId
 * @property {(name: string, emoji: string, color: string) => Workspace} createWS
 * @property {(type: AppId, title: string, appColor?: string) => NovaDoc} createDoc
 * @property {(id: string, changes: Partial<NovaDoc>) => void} updateDoc
 * @property {(id: string) => void} deleteDoc
 * @property {(id: string) => void} toggleStar
 */

/**
 * @typedef {Object} TabsStore
 * @property {TabEntry[]}  tabs
 * @property {string|null} activeTabId
 * @property {TabEntry|null} activeDoc
 * @property {(doc: NovaDoc) => void} openTab
 * @property {(id: string, e?: React.MouseEvent) => void} closeTab
 * @property {(id: string, changes: Partial<TabEntry>) => void} syncTab
 * @property {(id: string|null) => void} setActiveTabId
 */

/**
 * @typedef {Object} CanvasHistory
 * @template T
 * @property {T} current
 * @property {(next: T) => void} push
 */