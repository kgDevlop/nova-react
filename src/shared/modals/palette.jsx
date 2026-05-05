import React, { useState, useEffect, useRef } from "react";
import { I } from "../icons";
import { useT } from "../theme";
import { useDeviceCaps } from "../hooks/system";
import { AppChip } from "../atoms";
import { PaletteConstants } from "../_constants";
import { utils, registry as registryU } from "../_utils";

export const CommandPalette = ({
  onClose,
  docs,
  onOpenDoc,
  onNewDoc,
  onNav,
  setShowSettings,
  setShowShortcuts,
}) => {
  const theme = useT();
  const { isMobile } = useDeviceCaps();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Match scoring ─────────────────────────────────────────────────────────
  // Higher = better match. Empty query returns 1 so unfiltered lists keep
  // their original order.
  const computeScore = (sourceText, queryText) => {
    if (!queryText) {
      return 1;
    }
    const lowerSource = sourceText.toLowerCase();
    const lowerQuery  = queryText.toLowerCase();
    if (lowerSource === lowerQuery) {
      return 100;
    }
    if (lowerSource.startsWith(lowerQuery)) {
      return 80;
    }
    if (lowerSource.includes(lowerQuery)) {
      return 50;
    }
    return 0;
  };

  // ── Command sources ───────────────────────────────────────────────────────

  const APP_CMDS = PaletteConstants.APPS.map(app => {
    // Calendar is a workspace-wide singleton — phrase the entry as Open, not New.
    const isSingleton = app.appId === "calendar";
    return {
      type: "app",
      id: `new:${app.appId}`,
      label: isSingleton ? `Open ${app.label}` : `New ${app.label}`,
      sub: isSingleton
        ? `Open the workspace ${app.label.toLowerCase()}`
        : `Create a new ${app.label} document`,
      appId: app.appId,
      action: () => {
        onNewDoc(app.appId);
        onClose();
      },
    };
  });

  const NAV_CMDS = [
    {
      type: "nav",
      id: "navHome",
      label: "Go to Home",
      sub: "Back to the home screen",
      action: () => { onNav("home"); onClose(); },
    },
    {
      type: "nav",
      id: "navStarred",
      label: "Starred documents",
      sub: "View starred documents",
      action: () => { onNav("starred"); onClose(); },
    },
    {
      type: "nav",
      id: "navCatalogue",
      label: "Catalogue",
      sub: `See all ${PaletteConstants.APPS.length} Nova apps`,
      action: () => { onNav("catalogue"); onClose(); },
    },
    {
      type: "nav",
      id: "openSettings",
      label: "Open Settings",
      sub: "Appearance and app colours",
      action: () => { setShowSettings(true); onClose(); },
    },
    {
      type: "nav",
      id: "openShortcuts",
      label: "Keyboard shortcuts",
      sub: "See all keyboard shortcuts",
      action: () => { setShowShortcuts(true); onClose(); },
    },
  ];

  const DOC_CMDS = docs.slice(0, 80).map(workspaceDoc => ({
    type: "doc",
    id: `doc:${workspaceDoc.id}`,
    label: workspaceDoc.title,
    sub: `${registryU._app(workspaceDoc.type).label} · ${utils._rel(workspaceDoc.modified)}`,
    appId: workspaceDoc.type,
    action: () => {
      onOpenDoc(workspaceDoc);
      onClose();
    },
  }));

  // ── Result list ───────────────────────────────────────────────────────────
  // With a query: rank everything by score and trim to 14.
  // Without: show a small recent slice plus all nav commands.
  const allCommands = [...DOC_CMDS, ...APP_CMDS, ...NAV_CMDS];
  let results;
  if (searchQuery.trim()) {
    results = allCommands
      .map(command => ({ ...command, score: computeScore(command.label, searchQuery) }))
      .filter(scoredCommand => scoredCommand.score > 0)
      .sort((firstScored, secondScored) => secondScored.score - firstScored.score)
      .slice(0, 14);
  } else {
    results = [...DOC_CMDS.slice(0, 5), ...APP_CMDS.slice(0, 5), ...NAV_CMDS];
  }

  const handleKey = paletteKeyDownEvent => {
    if (paletteKeyDownEvent.key === "ArrowDown") {
      paletteKeyDownEvent.preventDefault();
      setSelectedIndex(currentIndex => Math.min(currentIndex + 1, results.length - 1));
    } else if (paletteKeyDownEvent.key === "ArrowUp") {
      paletteKeyDownEvent.preventDefault();
      setSelectedIndex(currentIndex => Math.max(currentIndex - 1, 0));
    } else if (paletteKeyDownEvent.key === "Enter") {
      paletteKeyDownEvent.preventDefault();
      results[Math.min(selectedIndex, results.length - 1)]?.action?.();
    } else if (paletteKeyDownEvent.key === "Escape") {
      onClose();
    }
  };

  const groupLabel = { app: "Create", nav: "Navigate", doc: "Recent" };
  let previousGroup = null;

  return (
    <div
      className="novl"
      onClick={overlayClickEvent => {
        if (overlayClickEvent.target === overlayClickEvent.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: theme.elevated,
          border: `1px solid ${theme.borderStrong}`,
          borderRadius: theme.radius20,
          width: "100%",
          maxWidth: 560,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          animation: "popIn 0.15s ease",
          marginTop: "-10vh",
        }}
      >
        {/* ── Search input ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <I.Search size={16} color={theme.textDim} />
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={searchChangeEvent => {
              setSearchQuery(searchChangeEvent.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKey}
            placeholder="Search docs, create, navigate…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 14,
              color: theme.text,
              fontFamily: theme.fontFamily,
            }}
          />
          {isMobile ? (
            <button
              type="button"
              className="nb ni"
              onClick={onClose}
              title="Close"
              style={{ padding: 6, flexShrink: 0 }}
            >
              <I.X size={14} />
            </button>
          ) : (
            <kbd
              style={{
                fontSize: 9,
                color: theme.textMuted,
                background: theme.surfaceAlt,
                border: `1px solid ${theme.border}`,
                borderRadius: theme.radius6,
                padding: "1px 5px",
                flexShrink: 0,
              }}
            >
              ESC
            </kbd>
          )}
        </div>

        {/* ── Results ── */}
        <div style={{ maxHeight: 380, overflowY: "auto" }}>
          {results.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 12, color: theme.textMuted }}>
              No results for "{searchQuery}"
            </div>
          )}
          {results.map((command, commandIndex) => {
            const showGroupHeader = command.type !== previousGroup;
            previousGroup = command.type;
            return (
              <React.Fragment key={command.id}>
                {showGroupHeader && (
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: theme.textMuted,
                      padding: "8px 16px 3px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {groupLabel[command.type] || command.type}
                  </div>
                )}
                <div
                  onClick={command.action}
                  onMouseEnter={() => setSelectedIndex(commandIndex)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 12px",
                    margin: "0 4px",
                    borderRadius: theme.radius10,
                    cursor: "pointer",
                    background: commandIndex === selectedIndex ? theme.surfaceAlt : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  {command.appId ? (
                    <AppChip appId={command.appId} size={28} />
                  ) : (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: theme.radius6,
                        background: theme.surfaceAlt,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <I.ArrowR size={12} color={theme.textDim} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: theme.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {command.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: theme.textMuted,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {command.sub}
                    </div>
                  </div>
                  {commandIndex === selectedIndex && (
                    <kbd
                      style={{
                        fontSize: 9,
                        color: theme.textMuted,
                        background: theme.surfaceAlt,
                        border: `1px solid ${theme.border}`,
                        borderRadius: theme.radius6,
                        padding: "1px 5px",
                        flexShrink: 0,
                      }}
                    >
                      ↵
                    </kbd>
                  )}
                </div>
              </React.Fragment>
            );
          })}
          <div style={{ height: 8 }} />
        </div>
      </div>
    </div>
  );
};
