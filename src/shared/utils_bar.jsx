import React from "react";
import { I } from "./icons";
import { useT } from "./theme";
import { registry } from "./_utils";

export const TabBar = ({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  getAppColor,
  activeWS,
  onSearchClick,
  onBack,
  onForward,
  canBack,
  canForward,
}) => {
  const theme = useT();

  const navBtnStyle = enabled => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    border: "none",
    background: "transparent",
    borderRadius: theme.r6,
    cursor: enabled ? "pointer" : "default",
    color: enabled ? theme.tx : theme.tm,
    opacity: enabled ? 1 : 0.4,
    padding: 0,
    transition: theme.tr,
    flexShrink: 0,
  });

  const showNav = onBack || onForward;

  return (
    <div
      style={{
        height: 38,
        background: theme.surface,
        borderBottom: `1px solid ${theme.bd}`,
        display: "flex",
        alignItems: "flex-end",
        padding: "0 4px 0 10px",
        flexShrink: 0,
        gap: 1,
      }}
    >
      {showNav && (
        <div
          style={{
            alignSelf: "center",
            display: "flex",
            alignItems: "center",
            gap: 2,
            marginBottom: 3,
            marginRight: 6,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            title="Back"
            disabled={!canBack}
            onClick={onBack}
            style={navBtnStyle(!!canBack)}
          >
            <I.ArrowL size={13} />
          </button>
          <button
            type="button"
            title="Forward"
            disabled={!canForward}
            onClick={onForward}
            style={navBtnStyle(!!canForward)}
          >
            <I.ArrowR size={13} />
          </button>
        </div>
      )}

      {onSearchClick && (
        <div
          onClick={onSearchClick}
          onMouseEnter={e => {
            const el = e.currentTarget;
            el.style.opacity = "1";
            el.style.borderColor = theme.bs;
          }}
          onMouseLeave={e => {
            const el = e.currentTarget;
            el.style.opacity = "0.85";
            el.style.borderColor = theme.bd;
          }}
          style={{
            alignSelf: "center",
            width: "33%",
            minWidth: 160,
            maxWidth: 340,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 11px",
            borderRadius: theme.rF,
            background: theme.sa,
            border: `1px solid ${theme.bd}`,
            cursor: "pointer",
            transition: theme.tr,
            opacity: 0.85,
            marginBottom: 3,
            flexShrink: 0,
          }}
        >
          <I.Search size={12} color={theme.tm} />
          <span style={{ flex: 1, fontSize: 11, color: theme.tm }}>Search Nova</span>
          <kbd
            style={{
              fontSize: 9,
              color: theme.tm,
              background: theme.surface,
              border: `1px solid ${theme.bd}`,
              borderRadius: theme.r6,
              padding: "1px 5px",
              fontFamily: "monospace",
            }}
          >
            ⌘K
          </kbd>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 1,
          flex: 1,
          minWidth: 0,
          overflowX: "auto",
        }}
      >
        {tabs.map(doc => {
          const def = registry._app(doc.type);
          const color = doc.appColor || getAppColor(activeWS.id, doc.type, def.dc);
          const isActive = doc.id === activeTabId;
          // Calendar is a singleton; its tab label always tracks the active
          // workspace name rather than the doc's stored title.
          const displayTitle = doc.type === "calendar"
            ? `Calendar — ${activeWS?.name || ""}`
            : doc.title;

          return (
            <div
              key={doc.id}
              onClick={() => onSelect(doc.id)}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = theme.sh;
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = theme.surface;
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0 8px 0 10px",
                height: 32,
                cursor: "pointer",
                borderRadius: `${theme.r6} ${theme.r6} 0 0`,
                background: isActive ? theme.el : theme.surface,
                border: `1px solid ${isActive ? theme.bd : "transparent"}`,
                // Active tab visually merges into the panel below by hiding its bottom border.
                borderBottom: isActive ? `1px solid ${theme.el}` : "none",
                maxWidth: 200,
                minWidth: 90,
                flexShrink: 0,
                zIndex: isActive ? 2 : 1,
                position: "relative",
                transition: theme.tr,
                marginBottom: isActive ? -1 : 0,
              }}
            >
              <def.Icon size={12} color={color} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? theme.tx : theme.ts,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {displayTitle}
              </span>
              <button
                onClick={e => onClose(doc.id, e)}
                onMouseEnter={e => {
                  e.currentTarget.style.background = theme.sa;
                  e.currentTarget.style.color = theme.tx;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = theme.tm;
                }}
                style={{
                  width: 14,
                  height: 14,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: theme.tm,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 3,
                  padding: 0,
                  flexShrink: 0,
                  transition: theme.tr,
                }}
              >
                <I.X size={10} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
