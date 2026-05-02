// _utils.js
//
// Centralized pure utility functions for Nova.
//
// Functions are grouped by the source file they belong to (the file where
// they were originally defined). Each group is exported under the file's
// basename so a consumer only ever imports one name per source group:
//
//     import { utils } from "../shared/_utils";
//     ...utils._uid()
//
// When a consumer file uses functions from multiple groups, it imports each
// group it needs (still one name per group).

import {
  utils as utils_C,
  registry as registry_C,
  canvas_utils as canvas_utils_C,
} from "./_constants";

// ═══════════════════════════════════════════════════════════════════════════
// registry.js  (declared first so other groups can reference _app)
// Used in: src/nova_base.jsx, src/shared/utils_bar.jsx, src/shell/home.jsx,
//          src/shell/shell.jsx, src/shared/atoms.jsx,
//          src/shared/modals/palette.jsx, src/shared/modals/new_doc_popup.jsx,
//          and below in `utils._autoName`.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Look up an app definition by its id, falling back to the first app when
 * the id is unknown. Never returns `undefined`.
 * @param {string} id - The app id (e.g. "writer", "sheets").
 * @returns {object} The matching app definition from the registry.
 */
const _app = (id) => registry_C.APPS.find(a => a.id === id) || registry_C.APPS[0];

export const registry = { _app };

// ═══════════════════════════════════════════════════════════════════════════
// utils.jsx
// Used in: src/shell/home.jsx, src/shared/notifications.jsx,
//          src/shared/modals/palette.jsx, src/shared/modals/new_doc_popup.jsx,
//          src/shared/hooks/store.jsx, src/apps/slides.jsx, src/apps/draw.jsx,
//          src/apps/list.jsx, src/shared/canvas_utils.jsx (and below in
//          `canvas_utils._mkSlide`).
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a short, time-prefixed random unique id (used for doc / workspace ids).
 * @returns {string} 36-base id, e.g. "lz8q3p_a4f2".
 */
const _uid = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

/**
 * Build a Date that is `ms` milliseconds in the past.
 * @param {number} ms - Offset in milliseconds.
 * @returns {Date} A Date `ms` ago from now.
 */
const _ago = (ms) => new Date(Date.now() - ms);

/**
 * Format a timestamp as a human-readable relative time. Falls back to a
 * short "Mon D" date string for anything older than a week.
 * @param {Date|number} d - Timestamp or Date.
 * @returns {string} e.g. "Just now", "5m ago", "Apr 12".
 */
const _rel = (d) => {
  const diff = Date.now() - d;
  const m = Math.floor(diff / 6e4);
  const h = Math.floor(diff / 36e5);
  const dy = Math.floor(diff / 864e5);

  if (m < 1) {
    return "Just now";
  }
  if (m < 60) {
    return `${m}m ago`;
  }
  if (h < 24) {
    return `${h}h ago`;
  }
  if (dy < 7) {
    return `${dy}d ago`;
  }
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/**
 * Filter docs by a case-insensitive title substring match. Empty queries
 * return the input unchanged.
 * @param {Array<{title:string}>} docs
 * @param {string} q - Search query.
 * @returns {Array} Subset of `docs` whose title matches.
 */
const _filterQ = (docs, q) => {
  const lq = q.trim().toLowerCase();
  if (!lq) {
    return docs;
  }
  return docs.filter(d => d.title.toLowerCase().includes(lq));
};

/**
 * Filter docs by a "view" — either an app id (e.g. "writer"), the special
 * value "starred", or anything else (returns all browseable). Calendar docs
 * are always excluded since calendar is a singleton.
 * @param {Array<{type:string,starred:boolean}>} docs
 * @param {string} v - View id.
 * @returns {Array} Filtered docs.
 */
const _filterV = (docs, v) => {
  const browseable = docs.filter(d => d.type !== "calendar");
  if (registry_C.APPS.map(a => a.id).includes(v)) {
    return browseable.filter(d => d.type === v);
  }
  if (v === "starred") {
    return browseable.filter(d => d.starred);
  }
  return browseable;
};

/**
 * Sort docs (returns a new array) by one of "modified" | "name" | type.
 * @param {Array} docs
 * @param {string} by - Sort key.
 * @returns {Array} Sorted copy.
 */
const _sortD = (docs, by) => {
  return [...docs].sort((a, b) => {
    if (by === "modified") {
      return b.modified - a.modified;
    }
    if (by === "name") {
      return a.title.localeCompare(b.title);
    }
    return a.type.localeCompare(b.type);
  });
};

/**
 * Look up the human-readable title for a view id; falls back to "Home".
 * @param {string} v - View id.
 * @returns {string} Display title.
 */
const _vtitle = (v) => utils_C.VIEW_TITLES[v] ?? "Home";

/**
 * Build full doc records from partial defs, filling in id / starred / content.
 * @param {Array<object>} defs - Partial doc shapes.
 * @returns {Array<object>} Hydrated doc records.
 */
const _mk = (defs) => defs.map(d => ({ id: _uid(), starred: false, content: "", ...d }));

/**
 * Build the auto-generated default title for a new doc of the given type.
 * @param {string} type - App id.
 * @returns {string} e.g. "Writer — Apr 12, 2025".
 */
const _autoName = (type) => {
  const def = _app(type);
  const now = new Date();
  const date = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${def.label} — ${date}`;
};

/**
 * Pick a non-conflicting title within (type, docs), suffixing " (n)" as
 * needed. Strips any existing " (n)" suffix on `desired` so duplicates
 * don't pile up.
 * @param {Array<{type:string,id:string,title:string}>} docs
 * @param {string} type - App id; only docs of this type collide.
 * @param {string} desired - Proposed title.
 * @param {string|null} [excludeId=null] - Skip this doc when checking
 *        collisions (used during rename so a doc doesn't conflict with itself).
 * @returns {string} Unique title.
 */
const _uniqueTitle = (docs, type, desired, excludeId = null) => {
  const taken = new Set(
    docs
      .filter(d => d.type === type && d.id !== excludeId)
      .map(d => d.title),
  );

  if (!taken.has(desired)) {
    return desired;
  }

  const base = desired.replace(/ \(\d+\)$/, "");
  let n = 2;
  while (taken.has(`${base} (${n})`)) {
    n++;
  }
  return `${base} (${n})`;
};

/**
 * Generate a short random id for a canvas/slide element. Shorter than `_uid`
 * since collisions only need to be unique within a single doc.
 * @returns {string} 6-character base-36 id.
 */
const _elId = () => Math.random().toString(36).slice(2, 8);

export const utils = {
  _uid,
  _ago,
  _rel,
  _filterQ,
  _filterV,
  _sortD,
  _vtitle,
  _mk,
  _autoName,
  _uniqueTitle,
  _elId,
};

// ═══════════════════════════════════════════════════════════════════════════
// formulas.js — Sheets formula engine. Pure logic, no React deps.
// Used in: src/apps/spreads.jsx
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert a 0-based column index to spreadsheet letters (0 → A, 26 → AA).
 * @param {number} n - 0-based column index.
 * @returns {string} Spreadsheet column letters.
 */
const _colLetter = (n) => {
  let s = "";
  let i = n + 1;
  while (i > 0) {
    s = String.fromCharCode(64 + (i % 26 || 26)) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
};

/**
 * Build the A1-style key for a (row, col) coordinate. Both indices are 0-based.
 * @param {number} r - Row index (0-based).
 * @param {number} c - Column index (0-based).
 * @returns {string} e.g. "A1", "B12".
 */
const _cellKey = (r, c) => `${_colLetter(c)}${r + 1}`;

/**
 * Parse an A1-style cell ref into a 0-indexed `{row, col}` object.
 * @param {string} ref - e.g. "A1", "BC42".
 * @returns {{row:number, col:number}|null} Parsed coords, or null on bad input.
 */
const _parseRef = (ref) => {
  const m = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!m) {
    return null;
  }
  const col = m[1]
    .toUpperCase()
    .split("")
    .reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  return { row: parseInt(m[2]) - 1, col };
};

/**
 * Resolve a comma-separated arg list (mixing single refs and A1:B2 ranges)
 * into an array of numeric values; non-numeric cells are skipped.
 * @param {string} argStr - Raw comma-separated arg string.
 * @param {Object<string,{display?:any, raw?:any}>} cells - Cell map keyed by A1 ref.
 * @returns {number[]} Numeric values found in the resolved range.
 */
const _rangeVals = (argStr, cells) => {
  const results = [];
  for (const rawArg of argStr.split(",")) {
    const arg = rawArg.trim();
    const rng = arg.match(/^([A-Z]+\d+):([A-Z]+\d+)$/i);
    if (rng) {
      const s = _parseRef(rng[1]);
      const e = _parseRef(rng[2]);
      if (s && e) {
        for (let r = s.row; r <= e.row; r++) {
          for (let c = s.col; c <= e.col; c++) {
            const cell = cells[_cellKey(r, c)];
            const v = parseFloat(cell?.display ?? cell?.raw);
            if (!isNaN(v)) {
              results.push(v);
            }
          }
        }
      }
    } else {
      const cell = cells[arg];
      const v = parseFloat(cell?.display ?? cell?.raw);
      if (!isNaN(v)) {
        results.push(v);
      }
    }
  }
  return results;
};

/**
 * Evaluate a spreadsheet formula string against a cell map.
 *
 * Supports:
 *   - Named functions: SUM, AVERAGE/AVG, MIN, MAX, COUNT, COUNTA, ROUND
 *   - Arithmetic expressions with cell-ref substitution (e.g. "=A1+B1*2")
 *
 * Non-formula values pass through unchanged. Errors return "#ERR!".
 *
 * @param {string} formula - Formula text (must start with "=" to evaluate).
 * @param {Object<string,{display?:any, raw?:any}>} cells - Cell map.
 * @returns {number|string} Computed result, original value, or "#ERR!".
 */
const _evalFormula = (formula, cells) => {
  if (!formula || !formula.toString().startsWith("=")) {
    return formula;
  }
  const expr = formula.toString().slice(1).trim();

  try {
    const fnMatch = expr.match(/^([A-Z]+)\((.+)\)$/i);
    if (fnMatch) {
      const fn = fnMatch[1].toUpperCase();
      const args = fnMatch[2];
      const vals = _rangeVals(args, cells);

      if (fn === "SUM") {
        return vals.reduce((a, b) => a + b, 0);
      }
      if (fn === "AVERAGE" || fn === "AVG") {
        if (!vals.length) {
          return 0;
        }
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 1e6) / 1e6;
      }
      if (fn === "MIN") {
        return vals.length ? Math.min(...vals) : "";
      }
      if (fn === "MAX") {
        return vals.length ? Math.max(...vals) : "";
      }
      if (fn === "COUNT") {
        return vals.length;
      }
      if (fn === "COUNTA") {
        return args
          .split(",")
          .flatMap(a => (a.trim() ? [cells[a.trim()]].filter(Boolean) : []))
          .length;
      }
      if (fn === "ROUND") {
        const [v, d] = vals;
        const factor = Math.pow(10, d || 0);
        return Math.round(v * factor) / factor;
      }
    }

    const withVals = expr.replace(/[A-Z]+\d+/gi, ref => {
      const cell = cells[ref.toUpperCase()];
      if (!cell) {
        return "0";
      }
      const v = cell.display !== undefined ? cell.display : cell.raw;
      const n = parseFloat(v);
      return isNaN(n) ? "0" : n;
    });
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict";return(' + withVals + ')')();
    if (typeof result === "number") {
      return Math.round(result * 1e9) / 1e9;
    }
    return result;
  } catch {
    return "#ERR!";
  }
};

export const formulas = {
  _colLetter,
  _cellKey,
  _parseRef,
  _rangeVals,
  _evalFormula,
};

// ═══════════════════════════════════════════════════════════════════════════
// canvas_utils.jsx
// Used in: src/apps/slides.jsx
// (The React component `SelectionHandles` stays in canvas_utils.jsx since it
// renders JSX; only the pure builder `_mkSlide` is moved here.)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a blank slide with seed elements based on a layout preset. The
 * `theme` argument supplies the colors so the seed text matches the deck.
 * @param {"blank"|"title"|"content"|"twocol"} [layout="blank"]
 * @param {object} [theme] - Slide theme; defaults to the first SLIDE_THEMES preset.
 * @returns {object} Slide record `{ id, layout, bg, elements }`.
 */
const _mkSlide = (layout = "blank", theme = canvas_utils_C.SLIDE_THEMES[0]) => {
  const id = _elId();

  if (layout === "title") {
    return {
      id,
      layout,
      bg: theme.bg,
      elements: [
        {
          id: _elId(), type: "text", x: 40, y: 140, w: 720, h: 80,
          text: "Click to add title", fontSize: 36, bold: true,
          color: theme.hd, align: "center", placeholder: true,
        },
        {
          id: _elId(), type: "text", x: 40, y: 240, w: 720, h: 50,
          text: "Click to add subtitle", fontSize: 20, bold: false,
          color: theme.tx, align: "center", placeholder: true,
        },
      ],
    };
  }

  if (layout === "content") {
    return {
      id,
      layout,
      bg: theme.bg,
      elements: [
        {
          id: _elId(), type: "text", x: 40, y: 30, w: 720, h: 60,
          text: "Slide Title", fontSize: 28, bold: true,
          color: theme.hd, align: "left", placeholder: false,
        },
        {
          id: _elId(), type: "text", x: 40, y: 110, w: 720, h: 260,
          text: "• Add your content here\n• Second point\n• Third point",
          fontSize: 16, bold: false, color: theme.tx, align: "left", placeholder: false,
        },
      ],
    };
  }

  if (layout === "twocol") {
    return {
      id,
      layout,
      bg: theme.bg,
      elements: [
        {
          id: _elId(), type: "text", x: 40, y: 30, w: 720, h: 60,
          text: "Slide Title", fontSize: 28, bold: true,
          color: theme.hd, align: "left", placeholder: false,
        },
        {
          id: _elId(), type: "text", x: 40, y: 110, w: 340, h: 240,
          text: "Left column content", fontSize: 15, bold: false,
          color: theme.tx, align: "left", placeholder: false,
        },
        {
          id: _elId(), type: "text", x: 420, y: 110, w: 340, h: 240,
          text: "Right column content", fontSize: 15, bold: false,
          color: theme.tx, align: "left", placeholder: false,
        },
      ],
    };
  }

  return { id, layout: "blank", bg: theme.bg, elements: [] };
};

export const canvas_utils = { _mkSlide };
