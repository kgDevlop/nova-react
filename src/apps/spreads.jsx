import React, { useState, useEffect, useRef } from "react";
import { I } from "../shared/icons";
import { formulas } from "../shared/_utils";
import { spreads as spreadsConst } from "../shared/_constants";

export const SheetsEditor = ({ appColor, doc, t: theme, onContentChange, registerActions }) => {
  const COLS = Array.from({ length: spreadsConst.VISIBLE_COLS }, (_, i) => formulas._colLetter(i));

  const [cells, setCells] = useState(() => {
    try {
      return JSON.parse(doc.content || "{}");
    } catch {
      return {};
    }
  });
  const [activeKey, setActiveKey] = useState("A1");
  const [editKey, setEditKey] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [sheets, setSheets] = useState(["Sheet 1", "Sheet 2", "Sheet 3"]);
  const [activeSheet, setActiveSheet] = useState(0);
  const editInputRef = useRef(null);
  const gridRef = useRef(null);

  // Notify parent of cell changes so autosave can pick them up.
  useEffect(() => {
    onContentChange(JSON.stringify(cells));
  }, [cells]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cell display + edit commit ────────────────────────────────────────────

  const _display = key => {
    const cell = cells[key];
    if (!cell || cell.raw === "" || cell.raw === undefined) {
      return "";
    }
    const raw = cell.raw.toString();
    const val = raw.startsWith("=") ? formulas._evalFormula(cell.raw, cells) : cell.raw;
    if (typeof val === "number") {
      if (cell.fmt === "pct") {
        return (val * 100).toFixed(1) + "%";
      }
      if (cell.fmt === "$") {
        return "$" + val.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }
      if (Number.isInteger(val)) {
        return val.toString();
      }
      return parseFloat(val.toFixed(6)).toString();
    }
    return val?.toString() || "";
  };

  const _commitEdit = (key, val) => {
    setCells(prev => {
      // Empty value clears the cell entirely so it doesn't linger as `{ raw: "" }`.
      if (val === "" || val === null || val === undefined) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { ...prev[key], raw: val } };
    });
    setEditKey(null);
    setEditVal("");
  };

  const startEdit = (key, initial = null) => {
    const cell = cells[key];
    setEditKey(key);
    setEditVal(initial !== null ? initial : (cell?.raw ?? ""));
    // Defer focus until React mounts the edit input.
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 0);
  };

  // ── Navigation + key handling ─────────────────────────────────────────────

  const _navigate = (dr, dc) => {
    const ref = formulas._parseRef(activeKey);
    if (!ref) {
      return;
    }
    const nr = Math.max(0, Math.min(spreadsConst.VISIBLE_ROWS - 1, ref.row + dr));
    const nc = Math.max(0, Math.min(spreadsConst.VISIBLE_COLS - 1, ref.col + dc));
    setActiveKey(formulas._cellKey(nr, nc));
  };

  const handleGridKeyDown = e => {
    if (editKey) {
      return;
    }
    if (e.key === "ArrowUp") {
      _navigate(-1, 0);
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      _navigate(1, 0);
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      _navigate(0, -1);
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      _navigate(0, 1);
      e.preventDefault();
    } else if (e.key === "Enter" || e.key === "F2") {
      startEdit(activeKey);
      e.preventDefault();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      _commitEdit(activeKey, "");
      e.preventDefault();
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      // Any printable key starts edit mode pre-filled with that character.
      startEdit(activeKey, e.key);
      e.preventDefault();
    }
  };

  const handleEditKeyDown = e => {
    const ref = formulas._parseRef(editKey);
    if (!ref) {
      return;
    }
    if (e.key === "Enter") {
      _commitEdit(editKey, editVal);
      setActiveKey(formulas._cellKey(Math.min(ref.row + 1, spreadsConst.VISIBLE_ROWS - 1), ref.col));
      e.preventDefault();
    } else if (e.key === "Tab") {
      _commitEdit(editKey, editVal);
      setActiveKey(formulas._cellKey(ref.row, Math.min(ref.col + 1, spreadsConst.VISIBLE_COLS - 1)));
      e.preventDefault();
    } else if (e.key === "Escape") {
      setEditKey(null);
      setEditVal("");
    }
  };

  // ── Toolbar wiring ────────────────────────────────────────────────────────
  //
  // registerActions is invoked once at mount; without a ref the closure would
  // capture the initial activeKey and toolbar buttons would always target A1.

  const activeKeyRef = useRef(activeKey);
  useEffect(() => {
    activeKeyRef.current = activeKey;
  }, [activeKey]);

  useEffect(() => {
    registerActions((id, val) => {
      const key = activeKeyRef.current;
      if (!key) {
        return;
      }
      if (id === "dollar") {
        setCells(p => ({ ...p, [key]: { ...p[key], fmt: "$" } }));
      } else if (id === "pct") {
        setCells(p => ({ ...p, [key]: { ...p[key], fmt: "pct" } }));
      } else if (id === "bold") {
        setCells(p => ({ ...p, [key]: { ...p[key], bold: !p[key]?.bold } }));
      } else if (id === "italic") {
        setCells(p => ({ ...p, [key]: { ...p[key], italic: !p[key]?.italic } }));
      } else if (id === "aL") {
        setCells(p => ({ ...p, [key]: { ...p[key], align: "left" } }));
      } else if (id === "aC") {
        setCells(p => ({ ...p, [key]: { ...p[key], align: "center" } }));
      } else if (id === "aR") {
        setCells(p => ({ ...p, [key]: { ...p[key], align: "right" } }));
      }
    });
  }, []); // eslint-disable-line

  // ── Render ────────────────────────────────────────────────────────────────

  const activeRef = formulas._parseRef(activeKey) || { row: 0, col: 0 };
  const formulaDisplay = editKey ? editVal : (cells[activeKey]?.raw || "");

  return (
    <div
      onKeyDown={handleGridKeyDown}
      tabIndex={0}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        outline: "none",
      }}
    >
      {/* Formula bar */}
      <div
        style={{
          height: 30,
          background: theme.surface,
          borderBottom: `1px solid ${theme.bd}`,
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            minWidth: 48,
            textAlign: "center",
            fontSize: 10,
            fontWeight: 700,
            color: theme.ts,
            background: theme.sa,
            padding: "2px 8px",
            borderRadius: theme.r6,
            cursor: "pointer",
          }}
          onClick={() => startEdit(activeKey)}
        >
          {activeKey}
        </div>
        <div style={{ width: 1, height: 14, background: theme.bd }} />
        <span
          style={{
            fontSize: 12,
            color: theme.tx,
            flex: 1,
            fontFamily: "monospace",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {formulaDisplay || ""}
        </span>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflow: "auto" }} ref={gridRef}>
        <table
          style={{
            borderCollapse: "collapse",
            fontSize: 12,
            fontFamily: theme.fn,
            tableLayout: "fixed",
            userSelect: "none",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  width: spreadsConst.ROW_HEADER_WIDTH,
                  background: theme.sa,
                  border: `1px solid ${theme.bd}`,
                  position: "sticky",
                  top: 0,
                  left: 0,
                  zIndex: 3,
                }}
              />
              {COLS.map((c, ci) => {
                const isActiveCol = activeRef.col === ci;
                return (
                  <th
                    key={c}
                    style={{
                      width: spreadsConst.COL_WIDTH,
                      border: `1px solid ${theme.bd}`,
                      padding: "3px 0",
                      textAlign: "center",
                      color: isActiveCol ? appColor : theme.ts,
                      fontSize: 11,
                      fontWeight: isActiveCol ? 700 : 500,
                      position: "sticky",
                      top: 0,
                      zIndex: 2,
                      cursor: "pointer",
                      background: isActiveCol ? appColor + "15" : theme.sa,
                    }}
                  >
                    {c}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: spreadsConst.VISIBLE_ROWS }, (_, ri) => {
              const isActiveRow = activeRef.row === ri;
              return (
                <tr key={ri}>
                  <td
                    style={{
                      background: isActiveRow ? appColor + "15" : theme.sa,
                      border: `1px solid ${theme.bd}`,
                      padding: "0 6px",
                      textAlign: "center",
                      color: isActiveRow ? appColor : theme.tm,
                      fontSize: 10,
                      fontWeight: isActiveRow ? 700 : 400,
                      position: "sticky",
                      left: 0,
                      zIndex: 1,
                      width: spreadsConst.ROW_HEADER_WIDTH,
                    }}
                  >
                    {ri + 1}
                  </td>
                  {COLS.map((c, ci) => {
                    const key = formulas._cellKey(ri, ci);
                    const isActive = activeKey === key;
                    const isEditing = editKey === key;
                    const cell = cells[key];
                    const displayVal = _display(key);
                    const isFormula = cell?.raw?.toString().startsWith("=");

                    // Numbers right-align by default unless an explicit align is set.
                    const numericLooking =
                      !isNaN(parseFloat(displayVal)) && displayVal !== "";
                    const justify =
                      cell?.align === "center"
                        ? "center"
                        : cell?.align === "right"
                          ? "flex-end"
                          : numericLooking
                            ? "flex-end"
                            : "flex-start";

                    const isFormulaError =
                      isFormula && _display(key).toString().startsWith("#");

                    return (
                      <td
                        key={ci}
                        onClick={() => {
                          if (!isEditing) {
                            setActiveKey(key);
                            setEditKey(null);
                            setEditVal("");
                          }
                        }}
                        onDoubleClick={() => startEdit(key)}
                        style={{
                          border: `1px solid ${isActive ? appColor : theme.bd}`,
                          width: spreadsConst.COL_WIDTH,
                          height: spreadsConst.ROW_HEIGHT,
                          padding: 0,
                          background: isActive ? appColor + "10" : "transparent",
                          outline: isActive ? `2px solid ${appColor}` : "none",
                          outlineOffset: -1,
                          cursor: "cell",
                          overflow: "hidden",
                          position: "relative",
                          borderColor: isActive ? appColor : theme.bd,
                          borderWidth: isActive ? "1.5px" : "1px",
                        }}
                      >
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            value={editVal}
                            onChange={e => setEditVal(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            onBlur={() => _commitEdit(editKey, editVal)}
                            style={{
                              width: "100%",
                              height: "100%",
                              border: "none",
                              outline: "none",
                              background: theme.el,
                              fontFamily: "monospace",
                              fontSize: 12,
                              padding: "0 4px",
                              color: theme.tx,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              padding: "0 4px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              color: isFormulaError ? theme.er : theme.tx,
                              fontWeight: cell?.bold ? "700" : "400",
                              fontStyle: cell?.italic ? "italic" : "normal",
                              fontSize: 12,
                              justifyContent: justify,
                            }}
                          >
                            {displayVal}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sheet tabs */}
      <div
        style={{
          height: 30,
          background: theme.surface,
          borderTop: `1px solid ${theme.bd}`,
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
          gap: 2,
          flexShrink: 0,
        }}
      >
        {sheets.map((s, i) => {
          const isActive = i === activeSheet;
          return (
            <div
              key={s}
              onClick={() => setActiveSheet(i)}
              style={{
                padding: "3px 12px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: isActive ? 600 : 500,
                background: isActive ? theme.el : "transparent",
                color: isActive ? theme.tx : theme.ts,
                border: isActive ? `1px solid ${theme.bd}` : "none",
                borderBottom: "none",
                borderRadius: `${theme.r6} ${theme.r6} 0 0`,
              }}
            >
              {s}
            </div>
          );
        })}
        <button
          className="ni"
          style={{
            padding: 3,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            marginLeft: 4,
          }}
          onClick={() => setSheets(p => [...p, `Sheet ${p.length + 1}`])}
        >
          <I.Plus size={11} color={theme.ts} />
        </button>
      </div>
    </div>
  );
};
