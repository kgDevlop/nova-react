import React, { useState, useRef } from "react";
import { I } from "./icons";
import { useT } from "./theme";
import { useOut } from "./hooks/system";
import { registry } from "./_utils";

const BLOCK_W = 30;
const BLOCK_H = 28;
const BLOCK_GAP = 4;

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useOut(menuRef, () => setMenuOpen(false));

  const activeTab = tabs.find(t => t.id === activeTabId) || null;

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
    color: enabled ? theme.text : theme.textMuted,
    opacity: enabled ? 1 : 0.4,
    padding: 0,
    transition: theme.transition,
    flexShrink: 0,
  });

  const blockStyle = (active = false) => ({
    width: BLOCK_W,
    height: BLOCK_H,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.r8,
    background: active ? theme.surfaceAlt : "transparent",
    border: `1px solid ${active ? theme.borderStrong : theme.border}`,
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
    transition: theme.transition,
    color: theme.text,
  });

  const showNav = onBack || onForward;

  return (
    <div
      style={{
        height: 42,
        background: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
        display: "flex",
        alignItems: "center",
        padding: "0 8px 0 10px",
        flexShrink: 0,
        gap: 8,
      }}
    >
      {showNav && (
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
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
            el.style.borderColor = theme.borderStrong;
          }}
          onMouseLeave={e => {
            const el = e.currentTarget;
            el.style.opacity = "0.85";
            el.style.borderColor = theme.border;
          }}
          style={{
            width: "33%",
            minWidth: 160,
            maxWidth: 340,
            height: 28,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 11px",
            borderRadius: theme.rF,
            background: theme.surfaceAlt,
            border: `1px solid ${theme.border}`,
            cursor: "pointer",
            transition: theme.transition,
            opacity: 0.85,
            flexShrink: 0,
            boxSizing: "border-box",
          }}
        >
          <I.Search size={12} color={theme.textMuted} />
          <span style={{ flex: 1, fontSize: 11, color: theme.textMuted }}>Search Nova</span>
          <kbd
            style={{
              fontSize: 9,
              color: theme.textMuted,
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: theme.r6,
              padding: "1px 5px",
              fontFamily: "monospace",
            }}
          >
            ⌘K
          </kbd>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: BLOCK_GAP, minWidth: 0 }}>
        {activeTab && (
          <>
            <button
              type="button"
              title="Close active app"
              onClick={e => onClose(activeTab.id, e)}
              onMouseEnter={e => { e.currentTarget.style.background = theme.surfaceShade; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              style={blockStyle(false)}
            >
              <I.X size={12} color={theme.textMuted} />
            </button>
            <ActiveBlock
              doc={activeTab}
              theme={theme}
              color={getAppColor(activeWS.id, activeTab.type, theme.appColorFor(activeTab.type))}
              activeWS={activeWS}
              style={blockStyle(true)}
            />
          </>
        )}

        {tabs.length > 0 && (
          <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
            <button
              type="button"
              title="All open apps"
              onClick={() => setMenuOpen(v => !v)}
              onMouseEnter={e => {
                if (!menuOpen) e.currentTarget.style.background = theme.surfaceShade;
              }}
              onMouseLeave={e => {
                if (!menuOpen) e.currentTarget.style.background = "transparent";
              }}
              style={blockStyle(menuOpen)}
            >
              <I.ChevDown size={12} color={theme.textMuted} />
            </button>

            {menuOpen && (
              <div
                className="nmenu"
                style={{
                  left: 0,
                  top: "calc(100% + 4px)",
                  minWidth: 240,
                  maxHeight: 360,
                  overflowY: "auto",
                  zIndex: 500,
                }}
              >
                {tabs.map(doc => {
                  const def = registry._app(doc.type);
                  const c = getAppColor(activeWS.id, doc.type, theme.appColorFor(doc.type));
                  const isActive = doc.id === activeTabId;
                  const title = doc.type === "calendar"
                    ? `Calendar — ${activeWS?.name || ""}`
                    : doc.title;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        onSelect(doc.id);
                        setMenuOpen(false);
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = theme.surfaceShade; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isActive ? theme.surfaceAlt : "transparent"; }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 9px",
                        borderRadius: theme.r6,
                        cursor: "pointer",
                        transition: theme.transition,
                        background: isActive ? theme.surfaceAlt : "transparent",
                      }}
                    >
                      <def.Icon size={12} color={c} />
                      <span
                        style={{
                          flex: 1,
                          fontSize: 11,
                          fontWeight: isActive ? 600 : 400,
                          color: theme.text,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {title}
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onClose(doc.id, e);
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = theme.surfaceAlt;
                          e.currentTarget.style.color = theme.text;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = theme.textMuted;
                        }}
                        style={{
                          width: 16,
                          height: 16,
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          color: theme.textMuted,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 3,
                          padding: 0,
                          flexShrink: 0,
                          transition: theme.transition,
                        }}
                      >
                        <I.X size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Compact block representation of the active app. Shows the app's icon on its
// accent surface so it reads as "current" without resorting to the old wide
// pill. The X close button lives as a sibling block.
const ActiveBlock = ({ doc, theme, color, activeWS, style }) => {
  const def = registry._app(doc.type);
  const title = doc.type === "calendar"
    ? `Calendar — ${activeWS?.name || ""}`
    : doc.title;

  return (
    <div title={title} style={style}>
      <def.Icon size={14} color={color} />
    </div>
  );
};
