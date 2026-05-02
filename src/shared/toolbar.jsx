import React from "react";
import { useT } from "./theme";
import { toolbar as toolbarConst } from "./_constants";

// ── Renderer ──────────────────────────────────────────────────────────────

export const ToolbarRow = ({ appId, onAction, appColor }) => {
  const theme = useT();
  const cfg = toolbarConst.TOOLBARS[appId] || [];

  if (cfg.length === 0) return null;

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
                padding: "2px 10px 2px 5px",
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
