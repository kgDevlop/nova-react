// Sheets formula engine — pure logic, no React deps.

// Convert 0-based column index to spreadsheet letters (0 → A, 26 → AA).
export const _colLetter = (n) => {
  let s = "";
  let i = n + 1;
  while (i > 0) {
    s = String.fromCharCode(64 + (i % 26 || 26)) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
};

export const _cellKey = (r, c) => `${_colLetter(c)}${r + 1}`;

export const _parseRef = (ref) => {
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

// Resolve a comma-separated arg list (mixing single refs and A1:B2 ranges)
// into an array of numeric values, skipping anything non-numeric.
export const _rangeVals = (argStr, cells) => {
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

export const _evalFormula = (formula, cells) => {
  if (!formula || !formula.toString().startsWith("=")) {
    return formula;
  }
  const expr = formula.toString().slice(1).trim();

  try {
    // ── Named function form: SUM(A1:A5) ─────────────────────────────────
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

    // ── Arithmetic expression: substitute cell refs then evaluate ───────
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
