import React from "react";
import { I } from "./icons";
import { useT } from "./theme";

// ── Toolbar item factories ────────────────────────────────────────────────

const _B = (id, Icon, label) => ({ type: "btn", id, Icon, label });
const _S = () => ({ type: "sep" });
const _DD = (id, label, opts) => ({ type: "dd", id, label, opts });
const _SP = () => ({ type: "spacer" });
const _LB = (text) => ({ type: "label", text });

// ── Per-app toolbar configurations ────────────────────────────────────────

export const TOOLBARS = {
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
};

// ── Renderer ──────────────────────────────────────────────────────────────

export const ToolbarRow = ({ appId, onAction, appColor }) => {
  const theme = useT();
  const cfg = TOOLBARS[appId] || [];

  return (
    <div
      style={{
        height: 38,
        background: theme.surface,
        borderBottom: `1px solid ${theme.bd}`,
        display: "flex",
        alignItems: "center",
        padding: "0 8px",
        gap: 2,
        flexShrink: 0,
        overflowX: "auto",
      }}
    >
      {cfg.map((item, i) => {
        if (item.type === "sep") {
          return (
            <div
              key={i}
              style={{
                width: 1,
                height: 16,
                background: theme.bd,
                margin: "0 3px",
                flexShrink: 0,
              }}
            />
          );
        }

        if (item.type === "spacer") {
          return <div key={i} style={{ flex: 1 }} />;
        }

        if (item.type === "label") {
          return (
            <span
              key={i}
              style={{
                fontSize: 10,
                color: theme.tm,
                padding: "0 4px",
                fontFamily: theme.fn,
                flexShrink: 0,
              }}
            >
              {item.text}
            </span>
          );
        }

        if (item.type === "dd") {
          return (
            <select
              key={item.id}
              onChange={e => onAction?.(item.id, e.target.value)}
              style={{
                background: theme.surface,
                border: `1px solid ${theme.bd}`,
                color: theme.ts,
                fontFamily: theme.fn,
                fontSize: 11,
                borderRadius: theme.r6,
                padding: "2px 5px",
                cursor: "pointer",
                outline: "none",
                height: 26,
                maxWidth: 120,
                flexShrink: 0,
              }}
            >
              {item.opts?.map(o => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </select>
          );
        }

        if (item.type === "btn") {
          // Text-only buttons (no Icon) get horizontal padding instead of a fixed square.
          const isText = !item.Icon && item.label;
          return (
            <button
              key={item.id}
              title={item.label}
              onClick={() => onAction?.(item.id)}
              onMouseEnter={e => {
                e.currentTarget.style.background = theme.sa;
                e.currentTarget.style.color = theme.tx;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = theme.ts;
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: isText ? undefined : 28,
                height: 28,
                padding: isText ? "0 8px" : 0,
                borderRadius: theme.r6,
                border: "none",
                cursor: "pointer",
                background: "transparent",
                transition: theme.tr,
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 600,
                color: theme.ts,
                fontFamily: theme.fn,
              }}
            >
              {item.Icon ? <item.Icon size={14} /> : item.label}
            </button>
          );
        }

        return null;
      })}
    </div>
  );
};
