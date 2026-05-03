import React from "react";
import { useT } from "./theme";
import { ToolbarConstants } from "./_constants";

// ── Renderer ──────────────────────────────────────────────────────────────

export const ToolbarRow = ({ appId, onAction, appColor }) => {
  const theme = useT();
  const cfg = ToolbarConstants.TOOLBARS[appId] || [];

  if (cfg.length === 0) return null;

  return (
    <div
      style={{
        height: 38,
        background: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
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
                background: theme.border,
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
                color: theme.textMuted,
                padding: "0 4px",
                fontFamily: theme.fontFamily,
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
              key={item.actionId}
              onChange={e => onAction?.(item.actionId, e.target.value)}
              style={{
                background: theme.surface,
                border: `1px solid ${theme.border}`,
                color: theme.textDim,
                fontFamily: theme.fontFamily,
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
                <option key={o.value} value={o.value}>
                  {o.label}
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
              key={item.actionId}
              title={item.label}
              onClick={() => onAction?.(item.actionId)}
              onMouseEnter={e => {
                e.currentTarget.style.background = theme.surfaceAlt;
                e.currentTarget.style.color = theme.text;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = theme.textDim;
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
                transition: theme.transition,
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 600,
                color: theme.textDim,
                fontFamily: theme.fontFamily,
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
