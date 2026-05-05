import React from "react";
import { useT } from "./theme";
import { ToolbarConstants } from "./_constants";

// ── Renderer ──────────────────────────────────────────────────────────────

export const ToolbarRow = ({ appId, onAction, appColor }) => {
  const theme = useT();
  const toolbarItems = ToolbarConstants.TOOLBARS[appId] || [];

  if (toolbarItems.length === 0) return null;

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
      {toolbarItems.map((toolbarItem, itemIndex) => {
        if (toolbarItem.type === "separator") {
          return (
            <div
              key={itemIndex}
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

        if (toolbarItem.type === "spacer") {
          return <div key={itemIndex} style={{ flex: 1 }} />;
        }

        if (toolbarItem.type === "label") {
          return (
            <span
              key={itemIndex}
              style={{
                fontSize: 10,
                color: theme.textMuted,
                padding: "0 4px",
                fontFamily: theme.fontFamily,
                flexShrink: 0,
              }}
            >
              {toolbarItem.text}
            </span>
          );
        }

        if (toolbarItem.type === "dropdown") {
          return (
            <select
              key={toolbarItem.actionId}
              onChange={changeEvent => onAction?.(toolbarItem.actionId, changeEvent.target.value)}
              style={{
                background: theme.surface,
                border: `1px solid ${theme.border}`,
                color: theme.textDim,
                fontFamily: theme.fontFamily,
                fontSize: 11,
                borderRadius: theme.radius6,
                padding: "2px 10px 2px 5px",
                cursor: "pointer",
                outline: "none",
                height: 26,
                maxWidth: 120,
                flexShrink: 0,
              }}
            >
              {toolbarItem.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );
        }

        if (toolbarItem.type === "button") {
          // Text-only buttons (no Icon) get horizontal padding instead of a fixed square.
          const isTextButton = !toolbarItem.Icon && toolbarItem.label;
          return (
            <button
              key={toolbarItem.actionId}
              title={toolbarItem.label}
              onClick={() => onAction?.(toolbarItem.actionId)}
              onMouseEnter={mouseEnterEvent => {
                mouseEnterEvent.currentTarget.style.background = theme.surfaceAlt;
                mouseEnterEvent.currentTarget.style.color = theme.text;
              }}
              onMouseLeave={mouseLeaveEvent => {
                mouseLeaveEvent.currentTarget.style.background = "transparent";
                mouseLeaveEvent.currentTarget.style.color = theme.textDim;
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: isTextButton ? undefined : 28,
                height: 28,
                padding: isTextButton ? "0 8px" : 0,
                borderRadius: theme.radius6,
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
              {toolbarItem.Icon ? <toolbarItem.Icon size={14} /> : toolbarItem.label}
            </button>
          );
        }

        return null;
      })}
    </div>
  );
};
