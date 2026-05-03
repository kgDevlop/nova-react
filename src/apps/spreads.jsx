import React, { useState, useRef, useEffect } from "react";
import { I } from "../shared/icons";
import { formulas } from "../shared/_utils";
import { SpreadsConstants } from "../shared/_constants";
import { useDocState } from "../shared/hooks/doc_state";
import { AppsSidebar, AppsSidebarSection, DefaultSections } from "../shared/apps_sidebar";

const BG_SWATCHES = [
  null,
  "#FCA5A5", "#FCD34D", "#86EFAC", "#7DD3FC", "#C4B5FD", "#F9A8D4",
  "#FECACA", "#FEF3C7", "#D1FAE5", "#DBEAFE", "#EDE9FE", "#FCE7F3",
];

const TEXT_SWATCHES = [
  null,
  "#111827", "#DC2626", "#D97706", "#059669", "#2563EB", "#7C3AED", "#DB2777", "#6B7280",
];

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 22];

export const SpreadsEditor = ({
  appColor,
  doc,
  t: theme,
  onContentChange,
  registerActions,
  isMobile,
  onBack,
  saveStatus,
  activeWS,
  onTitleChange,
}) => {
  const COLS = Array.from({ length: SpreadsConstants.VISIBLE_COLS }, (_, i) => formulas._colLetter(i));

  const _parseCells = (content) => { try { return JSON.parse(content || "{}"); } catch { return {}; } };
  const [cells, setCells] = useDocState(doc, _parseCells, onContentChange);
  const [activeKey, setActiveKey] = useState("A1");
  const [editKey, setEditKey] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [spreads, setSpreads] = useState(["Spread 1", "Spread 2", "Spread 3"]);
  const [activeSpread, setActiveSpread] = useState(0);
  const editInputRef = useRef(null);
  const gridRef = useRef(null);

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

  const _setCellProp = (key, prop, val) => {
    setCells(p => ({ ...p, [key]: { ...p[key], [prop]: val } }));
  };

  const _toggleBorder = (key, side) => {
    setCells(p => {
      const cur = p[key]?.borders || { t: true, r: true, b: true, l: true };
      const next = { ...cur, [side]: !cur[side] };
      return { ...p, [key]: { ...p[key], borders: next } };
    });
  };

  const _setBordersAll = (key, on) => {
    const next = { t: on, r: on, b: on, l: on };
    setCells(p => ({ ...p, [key]: { ...p[key], borders: next } }));
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
    const nr = Math.max(0, Math.min(SpreadsConstants.VISIBLE_ROWS - 1, ref.row + dr));
    const nc = Math.max(0, Math.min(SpreadsConstants.VISIBLE_COLS - 1, ref.col + dc));
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
      setActiveKey(formulas._cellKey(Math.min(ref.row + 1, SpreadsConstants.VISIBLE_ROWS - 1), ref.col));
      e.preventDefault();
    } else if (e.key === "Tab") {
      _commitEdit(editKey, editVal);
      setActiveKey(formulas._cellKey(ref.row, Math.min(ref.col + 1, SpreadsConstants.VISIBLE_COLS - 1)));
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
  const activeCell = cells[activeKey] || {};

  const Swatch = ({ value, current, onPick, isText }) => {
    const selected = (current || null) === (value || null);
    const isNone = value === null;
    return (
      <button
        onClick={() => onPick(value)}
        title={isNone ? "Default" : value}
        style={{
          width: 22,
          height: 22,
          borderRadius: theme.r6,
          border: selected ? `2px solid ${appColor}` : `1px solid ${theme.border}`,
          background: isNone ? "transparent" : value,
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isText && !isNone ? value : theme.textMuted,
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {isNone && (isText ? "A" : <I.X size={11} color={theme.textMuted} />)}
      </button>
    );
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden", minHeight: 0 }}>
    <div
      onKeyDown={handleGridKeyDown}
      tabIndex={0}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        outline: "none",
        minWidth: 0,
      }}
    >
      {/* Spread tabs */}
      <div
        style={{
          height: 30,
          background: theme.surface,
          borderBottom: `1px solid ${theme.border}`,
          display: "flex",
          alignItems: "flex-end",
          padding: "0 8px",
          gap: 2,
          flexShrink: 0,
        }}
      >
        {spreads.map((s, i) => {
          const isActive = i === activeSpread;
          return (
            <div
              key={s}
              onClick={() => setActiveSpread(i)}
              style={{
                padding: "3px 12px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: isActive ? 600 : 500,
                background: isActive ? theme.elevated : "transparent",
                color: isActive ? theme.text : theme.textDim,
                border: isActive ? `1px solid ${theme.border}` : "none",
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
            marginBottom: 2,
          }}
          onClick={() => setSpreads(p => [...p, `Spread ${p.length + 1}`])}
        >
          <I.Plus size={11} color={theme.textDim} />
        </button>
      </div>

      {/* Formula bar */}
      <div
        style={{
          height: 30,
          background: theme.surface,
          borderBottom: `1px solid ${theme.border}`,
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
            color: theme.textDim,
            background: theme.surfaceAlt,
            padding: "2px 8px",
            borderRadius: theme.r6,
            cursor: "pointer",
          }}
          onClick={() => startEdit(activeKey)}
        >
          {activeKey}
        </div>
        <div style={{ width: 1, height: 14, background: theme.border }} />
        <span
          style={{
            fontSize: 12,
            color: theme.text,
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
            fontFamily: theme.fontFamily,
            tableLayout: "fixed",
            userSelect: "none",
            width: SpreadsConstants.ROW_HEADER_WIDTH + SpreadsConstants.COL_WIDTH * SpreadsConstants.VISIBLE_COLS,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  width: SpreadsConstants.ROW_HEADER_WIDTH,
                  background: theme.surfaceAlt,
                  border: `1px solid ${theme.border}`,
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
                      width: SpreadsConstants.COL_WIDTH,
                      border: `1px solid ${theme.border}`,
                      padding: "3px 0",
                      textAlign: "center",
                      color: isActiveCol ? appColor : theme.textDim,
                      fontSize: 11,
                      fontWeight: isActiveCol ? 700 : 500,
                      position: "sticky",
                      top: 0,
                      zIndex: 2,
                      cursor: "pointer",
                      background: isActiveCol ? appColor + "15" : theme.surfaceAlt,
                    }}
                  >
                    {c}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: SpreadsConstants.VISIBLE_ROWS }, (_, ri) => {
              const isActiveRow = activeRef.row === ri;
              return (
                <tr key={ri}>
                  <td
                    style={{
                      background: isActiveRow ? appColor + "15" : theme.surfaceAlt,
                      border: `1px solid ${theme.border}`,
                      padding: "0 6px",
                      textAlign: "center",
                      color: isActiveRow ? appColor : theme.textMuted,
                      fontSize: 10,
                      fontWeight: isActiveRow ? 700 : 400,
                      position: "sticky",
                      left: 0,
                      zIndex: 1,
                      width: SpreadsConstants.ROW_HEADER_WIDTH,
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

                    const borders = cell?.borders;
                    const bClr = cell?.borderColor || theme.border;
                    const sideStyle = side =>
                      borders
                        ? (borders[side] ? `1px solid ${bClr}` : "1px solid transparent")
                        : `1px solid ${theme.border}`;
                    const cellBg = cell?.bg
                      ? cell.bg
                      : isActive
                        ? appColor + "10"
                        : "transparent";

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
                          borderTop: isActive ? `1.5px solid ${appColor}` : sideStyle("t"),
                          borderRight: isActive ? `1.5px solid ${appColor}` : sideStyle("r"),
                          borderBottom: isActive ? `1.5px solid ${appColor}` : sideStyle("b"),
                          borderLeft: isActive ? `1.5px solid ${appColor}` : sideStyle("l"),
                          width: SpreadsConstants.COL_WIDTH,
                          height: SpreadsConstants.ROW_HEIGHT,
                          padding: 0,
                          background: cellBg,
                          outline: isActive ? `2px solid ${appColor}` : "none",
                          outlineOffset: -1,
                          cursor: "cell",
                          overflow: "hidden",
                          position: "relative",
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
                              background: theme.elevated,
                              fontFamily: "monospace",
                              fontSize: 12,
                              padding: "0 4px",
                              color: theme.text,
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
                              color: isFormulaError ? theme.error : (cell?.color || theme.text),
                              fontWeight: cell?.bold ? "700" : "400",
                              fontStyle: cell?.italic ? "italic" : "normal",
                              fontSize: cell?.fontSize || 12,
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
    </div>

    <AppsSidebar
      doc={doc}
      appColor={appColor}
      mobile={isMobile}
      onBack={onBack}
      saveStatus={saveStatus}
      activeWS={activeWS}
      onTitleChange={onTitleChange}
    >
      <AppsSidebarSection title={`Cell ${activeKey}`} icon={I.Grid}>
        <div style={{ fontSize: 10, color: theme.textMuted, marginBottom: 6 }}>
          Styling applies to the active cell.
        </div>
      </AppsSidebarSection>

      <AppsSidebarSection title="Borders" icon={I.BorderAll}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
          <button
            className="nb ng"
            style={{ fontSize: 11, padding: "5px 9px" }}
            onClick={() => _setBordersAll(activeKey, true)}
          >
            All
          </button>
          <button
            className="nb ng"
            style={{ fontSize: 11, padding: "5px 9px" }}
            onClick={() => _setBordersAll(activeKey, false)}
          >
            None
          </button>
          <button
            className="nb ng"
            style={{ fontSize: 11, padding: "5px 9px" }}
            onClick={() => _setCellProp(activeKey, "borders", undefined)}
          >
            Reset
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 4, marginBottom: 8 }}>
          {[
            ["t", "Top"],
            ["b", "Bottom"],
            ["l", "Left"],
            ["r", "Right"],
          ].map(([side, label]) => {
            const on = activeCell.borders?.[side];
            return (
              <button
                key={side}
                onClick={() => _toggleBorder(activeKey, side)}
                style={{
                  fontSize: 11,
                  padding: "5px 8px",
                  borderRadius: theme.r6,
                  border: `1px solid ${on ? appColor : theme.border}`,
                  background: on ? appColor + "15" : "transparent",
                  color: on ? appColor : theme.text,
                  cursor: "pointer",
                  fontFamily: theme.fontFamily,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 10, color: theme.textMuted, marginBottom: 4 }}>Border color</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {[null, "#111827", "#DC2626", "#2563EB", "#059669", "#D97706"].map((c, i) => (
            <Swatch
              key={i}
              value={c}
              current={activeCell.borderColor}
              onPick={v => _setCellProp(activeKey, "borderColor", v || undefined)}
            />
          ))}
        </div>
      </AppsSidebarSection>

      <AppsSidebarSection title="Background" icon={I.Palette}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 22px)", gap: 4 }}>
          {BG_SWATCHES.map((c, i) => (
            <Swatch
              key={i}
              value={c}
              current={activeCell.bg}
              onPick={v => _setCellProp(activeKey, "bg", v || undefined)}
            />
          ))}
        </div>
      </AppsSidebarSection>

      <AppsSidebarSection title="Text" icon={I.TypeT}>
        <div style={{ fontSize: 10, color: theme.textMuted, marginBottom: 4 }}>Color</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 22px)", gap: 4, marginBottom: 10 }}>
          {TEXT_SWATCHES.map((c, i) => (
            <Swatch
              key={i}
              value={c}
              current={activeCell.color}
              onPick={v => _setCellProp(activeKey, "color", v || undefined)}
              isText
            />
          ))}
        </div>
        <div style={{ fontSize: 10, color: theme.textMuted, marginBottom: 4 }}>Size</div>
        <select
          value={activeCell.fontSize || 12}
          onChange={e => _setCellProp(activeKey, "fontSize", Number(e.target.value))}
          style={{
            width: "100%",
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            color: theme.text,
            fontSize: 12,
            fontFamily: theme.fontFamily,
            borderRadius: theme.r6,
            padding: "5px 8px",
            outline: "none",
            marginBottom: 10,
          }}
        >
          {FONT_SIZES.map(s => (
            <option key={s} value={s}>{s}px</option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => _setCellProp(activeKey, "bold", !activeCell.bold)}
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: theme.r6,
              border: `1px solid ${activeCell.bold ? appColor : theme.border}`,
              background: activeCell.bold ? appColor + "15" : "transparent",
              color: activeCell.bold ? appColor : theme.text,
              cursor: "pointer",
              fontFamily: theme.fontFamily,
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            B
          </button>
          <button
            onClick={() => _setCellProp(activeKey, "italic", !activeCell.italic)}
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: theme.r6,
              border: `1px solid ${activeCell.italic ? appColor : theme.border}`,
              background: activeCell.italic ? appColor + "15" : "transparent",
              color: activeCell.italic ? appColor : theme.text,
              cursor: "pointer",
              fontFamily: theme.fontFamily,
              fontStyle: "italic",
              fontSize: 12,
            }}
          >
            I
          </button>
        </div>
      </AppsSidebarSection>

      <DefaultSections doc={doc} defaultOpen={false} />
    </AppsSidebar>
    </div>
  );
};
