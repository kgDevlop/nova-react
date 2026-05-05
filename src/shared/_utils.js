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

import { UtilsConstants } from "./_constants";

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
 * @param {string} id - The app id (e.g. "writer", "spreads").
 * @returns {object} The matching app definition from the registry.
 */
const _app = (appId) => UtilsConstants.APPS.find(a => a.appId === appId) || UtilsConstants.APPS[0];

export const registry = { _app };

// ═══════════════════════════════════════════════════════════════════════════
// utils.jsx
// Used in: src/shell/home.jsx, src/shared/modals/palette.jsx,
//          src/shared/modals/new_doc_popup.jsx,
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
 * Build a Date that is `millisecondsAgo` milliseconds in the past.
 * @param {number} millisecondsAgo - Offset in milliseconds.
 * @returns {Date} A Date `millisecondsAgo` ago from now.
 */
const _ago = (millisecondsAgo) => new Date(Date.now() - millisecondsAgo);

/**
 * Format a timestamp as a human-readable relative time. Falls back to a
 * short "Mon D" date string for anything older than a week.
 * @param {Date|number} timestamp - Timestamp or Date.
 * @returns {string} e.g. "Just now", "5m ago", "Apr 12".
 */
const _rel = (timestamp) => {
  const millisecondsSince = Date.now() - timestamp;
  const minutesSince = Math.floor(millisecondsSince / 6e4);
  const hoursSince   = Math.floor(millisecondsSince / 36e5);
  const daysSince    = Math.floor(millisecondsSince / 864e5);

  if (minutesSince < 1) {
    return "Just now";
  }
  if (minutesSince < 60) {
    return `${minutesSince}m ago`;
  }
  if (hoursSince < 24) {
    return `${hoursSince}h ago`;
  }
  if (daysSince < 7) {
    return `${daysSince}d ago`;
  }
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/**
 * Filter docs by a case-insensitive title substring match. Empty queries
 * return the input unchanged.
 * @param {Array<{title:string}>} docs
 * @param {string} searchQuery - Search query.
 * @returns {Array} Subset of `docs` whose title matches.
 */
const _filterQ = (docs, searchQuery) => {
  const lowerQuery = searchQuery.trim().toLowerCase();
  if (!lowerQuery) {
    return docs;
  }
  return docs.filter(doc => doc.title.toLowerCase().includes(lowerQuery));
};

/**
 * Filter docs by a "view" — either an app id (e.g. "writer"), the special
 * value "starred", or anything else (returns all browseable). Calendar docs
 * are always excluded since calendar is a singleton.
 * @param {Array<{type:string,starred:boolean}>} docs
 * @param {string} viewName - View id.
 * @returns {Array} Filtered docs.
 */
const _filterV = (docs, viewName) => {
  const browseableDocs = docs.filter(doc => doc.type !== "calendar");
  if (UtilsConstants.APPS.map(app => app.appId).includes(viewName)) {
    return browseableDocs.filter(doc => doc.type === viewName);
  }
  if (viewName === "starred") {
    return browseableDocs.filter(doc => doc.starred);
  }
  return browseableDocs;
};

/**
 * Sort docs (returns a new array) by one of "modified" | "name" | type.
 * @param {Array} docs
 * @param {string} sortKey - Sort key.
 * @returns {Array} Sorted copy.
 */
const _sortD = (docs, sortKey) => {
  return [...docs].sort((firstDoc, secondDoc) => {
    if (sortKey === "modified") {
      return secondDoc.modified - firstDoc.modified;
    }
    if (sortKey === "name") {
      return firstDoc.title.localeCompare(secondDoc.title);
    }
    return firstDoc.type.localeCompare(secondDoc.type);
  });
};

/**
 * Look up the human-readable title for a view id; falls back to "Home".
 * @param {string} viewName - View id.
 * @returns {string} Display title.
 */
const _vtitle = (viewName) => UtilsConstants.VIEW_TITLES[viewName] ?? "Home";

/**
 * Build full doc records from partial defs, filling in id / starred / content.
 * @param {Array<object>} partialDocs - Partial doc shapes.
 * @returns {Array<object>} Hydrated doc records.
 */
const _mk = (partialDocs) => partialDocs.map(partialDoc => ({
  id: _uid(),
  starred: false,
  content: "",
  ...partialDoc,
}));

/**
 * Build the auto-generated default title for a new doc of the given type.
 * @param {string} appType - App id.
 * @returns {string} e.g. "Writer — Apr 12, 2025".
 */
const _autoName = (appType) => {
  const appDef = _app(appType);
  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${appDef.label} — ${dateLabel}`;
};

/**
 * Pick a non-conflicting title within (type, docs), suffixing " (n)" as
 * needed. Strips any existing " (n)" suffix on `desiredTitle` so duplicates
 * don't pile up.
 * @param {Array<{type:string,id:string,title:string}>} docs
 * @param {string} appType - App id; only docs of this type collide.
 * @param {string} desiredTitle - Proposed title.
 * @param {string|null} [excludeId=null] - Skip this doc when checking
 *        collisions (used during rename so a doc doesn't conflict with itself).
 * @returns {string} Unique title.
 */
const _uniqueTitle = (docs, appType, desiredTitle, excludeId = null) => {
  const takenTitles = new Set(
    docs
      .filter(doc => doc.type === appType && doc.id !== excludeId)
      .map(doc => doc.title),
  );

  if (!takenTitles.has(desiredTitle)) {
    return desiredTitle;
  }

  const baseTitle = desiredTitle.replace(/ \(\d+\)$/, "");
  let suffix = 2;
  for (; takenTitles.has(`${baseTitle} (${suffix})`); suffix++) {}
  return `${baseTitle} (${suffix})`;
};

/**
 * Generate a random id for a canvas/slide/list element. Uses crypto.randomUUID
 * for collision resistance — the previous 6-char base-36 form started colliding
 * around tens of thousands of ids.
 * @returns {string} UUID v4.
 */
const _elId = () => crypto.randomUUID();

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
// formulas.js — Spreads formula engine. Pure logic, no React deps.
// Used in: src/apps/spreads.jsx
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert a 0-based column index to spreadsheet letters (0 → A, 26 → AA).
 * @param {number} columnIndex - 0-based column index.
 * @returns {string} Spreadsheet column letters.
 */
const _colLetter = (columnIndex) => {
  let columnLetters = "";
  let remaining = columnIndex + 1;
  for (; remaining > 0;) {
    columnLetters = String.fromCharCode(64 + (remaining % 26 || 26)) + columnLetters;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return columnLetters;
};

/**
 * Build the A1-style key for a (row, col) coordinate. Both indices are 0-based.
 * @param {number} rowIndex - Row index (0-based).
 * @param {number} columnIndex - Column index (0-based).
 * @returns {string} e.g. "A1", "B12".
 */
const _cellKey = (rowIndex, columnIndex) => `${_colLetter(columnIndex)}${rowIndex + 1}`;

/**
 * Parse an A1-style cell ref into a 0-indexed `{row, col}` object.
 * @param {string} cellRef - e.g. "A1", "BC42".
 * @returns {{row:number, col:number}|null} Parsed coords, or null on bad input.
 */
const _parseRef = (cellRef) => {
  const refMatch = cellRef.match(/^([A-Z]+)(\d+)$/i);
  if (!refMatch) {
    return null;
  }
  const columnIndex = refMatch[1]
    .toUpperCase()
    .split("")
    .reduce((accumulated, letter) => accumulated * 26 + letter.charCodeAt(0) - 64, 0) - 1;
  return { row: parseInt(refMatch[2]) - 1, col: columnIndex };
};

/**
 * Resolve a comma-separated arg list (mixing single refs and A1:B2 ranges)
 * into an array of numeric values; non-numeric cells are skipped.
 * @param {string} argString - Raw comma-separated arg string.
 * @param {Object<string,{display?:any, raw?:any}>} cells - Cell map keyed by A1 ref.
 * @returns {number[]} Numeric values found in the resolved range.
 */
const _rangeVals = (argString, cells) => {
  const numericValues = [];
  for (const rawArg of argString.split(",")) {
    const trimmedArg = rawArg.trim();
    const rangeMatch = trimmedArg.match(/^([A-Z]+\d+):([A-Z]+\d+)$/i);
    if (rangeMatch) {
      const rangeStart = _parseRef(rangeMatch[1]);
      const rangeEnd   = _parseRef(rangeMatch[2]);
      if (rangeStart && rangeEnd) {
        for (let rowIndex = rangeStart.row; rowIndex <= rangeEnd.row; rowIndex++) {
          for (let columnIndex = rangeStart.col; columnIndex <= rangeEnd.col; columnIndex++) {
            const cell = cells[_cellKey(rowIndex, columnIndex)];
            const cellValue = parseFloat(cell?.display ?? cell?.raw);
            if (!isNaN(cellValue)) {
              numericValues.push(cellValue);
            }
          }
        }
      }
    } else {
      const cell = cells[trimmedArg];
      const cellValue = parseFloat(cell?.display ?? cell?.raw);
      if (!isNaN(cellValue)) {
        numericValues.push(cellValue);
      }
    }
  }
  return numericValues;
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
  const expression = formula.toString().slice(1).trim();

  try {
    const functionMatch = expression.match(/^([A-Z]+)\((.+)\)$/i);
    if (functionMatch) {
      const functionName = functionMatch[1].toUpperCase();
      const argsString   = functionMatch[2];
      const numericValues = _rangeVals(argsString, cells);

      if (functionName === "SUM") {
        return numericValues.reduce((sum, value) => sum + value, 0);
      }
      if (functionName === "AVERAGE" || functionName === "AVG") {
        if (!numericValues.length) {
          return 0;
        }
        const sum = numericValues.reduce((accumulated, value) => accumulated + value, 0);
        return Math.round(sum / numericValues.length * 1e6) / 1e6;
      }
      if (functionName === "MIN") {
        return numericValues.length ? Math.min(...numericValues) : "";
      }
      if (functionName === "MAX") {
        return numericValues.length ? Math.max(...numericValues) : "";
      }
      if (functionName === "COUNT") {
        return numericValues.length;
      }
      if (functionName === "COUNTA") {
        return argsString
          .split(",")
          .flatMap(rawArg => (rawArg.trim() ? [cells[rawArg.trim()]].filter(Boolean) : []))
          .length;
      }
      if (functionName === "ROUND") {
        const [valueToRound, decimalPlaces] = numericValues;
        const factor = Math.pow(10, decimalPlaces || 0);
        return Math.round(valueToRound * factor) / factor;
      }
    }

    const expressionWithValues = expression.replace(/[A-Z]+\d+/gi, refToken => {
      const cell = cells[refToken.toUpperCase()];
      if (!cell) {
        return "0";
      }
      const cellRawValue = cell.display !== undefined ? cell.display : cell.raw;
      const cellNumber   = parseFloat(cellRawValue);
      return isNaN(cellNumber) ? "0" : cellNumber;
    });
    // eslint-disable-next-line no-new-func
    const evaluated = Function('"use strict";return(' + expressionWithValues + ')')();
    if (typeof evaluated === "number") {
      return Math.round(evaluated * 1e9) / 1e9;
    }
    return evaluated;
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
const _mkSlide = (layout = "blank", theme = UtilsConstants.SLIDE_THEMES[0]) => {
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
          color: theme.heading, align: "center", placeholder: true,
        },
        {
          id: _elId(), type: "text", x: 40, y: 240, w: 720, h: 50,
          text: "Click to add subtitle", fontSize: 20, bold: false,
          color: theme.text, align: "center", placeholder: true,
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
          color: theme.heading, align: "left", placeholder: false,
        },
        {
          id: _elId(), type: "text", x: 40, y: 110, w: 720, h: 260,
          text: "• Add your content here\n• Second point\n• Third point",
          fontSize: 16, bold: false, color: theme.text, align: "left", placeholder: false,
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
          color: theme.heading, align: "left", placeholder: false,
        },
        {
          id: _elId(), type: "text", x: 40, y: 110, w: 340, h: 240,
          text: "Left column content", fontSize: 15, bold: false,
          color: theme.text, align: "left", placeholder: false,
        },
        {
          id: _elId(), type: "text", x: 420, y: 110, w: 340, h: 240,
          text: "Right column content", fontSize: 15, bold: false,
          color: theme.text, align: "left", placeholder: false,
        },
      ],
    };
  }

  return { id, layout: "blank", bg: theme.bg, elements: [] };
};

export const canvas_utils = { _mkSlide };
