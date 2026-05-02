import React, { useState, useEffect, useRef } from "react";
import { I } from "../icons";
import { useT } from "../theme";
import { useDeviceCaps } from "../hooks/system";
import { AppChip } from "../atoms";
import { registry as registryConst } from "../_constants";
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
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Match scoring ─────────────────────────────────────────────────────────
  // Higher = better match. Empty query returns 1 so unfiltered lists keep
  // their original order.
  const score = (str, query) => {
    if (!query) {
      return 1;
    }
    const sl = str.toLowerCase();
    const ql = query.toLowerCase();
    if (sl === ql) {
      return 100;
    }
    if (sl.startsWith(ql)) {
      return 80;
    }
    if (sl.includes(ql)) {
      return 50;
    }
    return 0;
  };

  // ── Command sources ───────────────────────────────────────────────────────

  const APP_CMDS = registryConst.APPS.map(a => {
    // Calendar is a workspace-wide singleton — phrase the entry as Open, not New.
    const isSingleton = a.id === "calendar";
    return {
      type: "app",
      id: `new:${a.id}`,
      label: isSingleton ? `Open ${a.label}` : `New ${a.label}`,
      sub: isSingleton
        ? `Open the workspace ${a.label.toLowerCase()}`
        : `Create a new ${a.label} document`,
      appId: a.id,
      action: () => {
        onNewDoc(a.id);
        onClose();
      },
    };
  });

  const NAV_CMDS = [
    {
      type: "nav",
      id: "nh",
      label: "Go to Home",
      sub: "Back to the home screen",
      action: () => { onNav("home"); onClose(); },
    },
    {
      type: "nav",
      id: "ns",
      label: "Starred documents",
      sub: "View starred documents",
      action: () => { onNav("starred"); onClose(); },
    },
    {
      type: "nav",
      id: "nc",
      label: "Catalogue",
      sub: `See all ${registryConst.APPS.length} Nova apps`,
      action: () => { onNav("catalogue"); onClose(); },
    },
    {
      type: "nav",
      id: "set",
      label: "Open Settings",
      sub: "Appearance and app colours",
      action: () => { setShowSettings(true); onClose(); },
    },
    {
      type: "nav",
      id: "kbd",
      label: "Keyboard shortcuts",
      sub: "See all keyboard shortcuts",
      action: () => { setShowShortcuts(true); onClose(); },
    },
  ];

  const DOC_CMDS = docs.slice(0, 80).map(d => ({
    type: "doc",
    id: `doc:${d.id}`,
    label: d.title,
    sub: `${registryU._app(d.type).label} · ${utils._rel(d.modified)}`,
    appId: d.type,
    action: () => {
      onOpenDoc(d);
      onClose();
    },
  }));

  // ── Result list ───────────────────────────────────────────────────────────
  // With a query: rank everything by score and trim to 14.
  // Without: show a small recent slice plus all nav commands.
  const all = [...DOC_CMDS, ...APP_CMDS, ...NAV_CMDS];
  let results;
  if (q.trim()) {
    results = all
      .map(c => ({ ...c, _s: score(c.label, q) }))
      .filter(c => c._s > 0)
      .sort((a, b) => b._s - a._s)
      .slice(0, 14);
  } else {
    results = [...DOC_CMDS.slice(0, 5), ...APP_CMDS.slice(0, 5), ...NAV_CMDS];
  }

  const handleKey = e => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel(s => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel(s => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[Math.min(sel, results.length - 1)]?.action?.();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const groupLabel = { app: "Create", nav: "Navigate", doc: "Recent" };
  let lastG = null;

  return (
    <div
      className="novl"
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: theme.el,
          border: `1px solid ${theme.bs}`,
          borderRadius: theme.r20,
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
            borderBottom: `1px solid ${theme.bd}`,
          }}
        >
          <I.Search size={16} color={theme.ts} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={handleKey}
            placeholder="Search docs, create, navigate…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 14,
              color: theme.tx,
              fontFamily: theme.fn,
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
                color: theme.tm,
                background: theme.sa,
                border: `1px solid ${theme.bd}`,
                borderRadius: theme.r6,
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
            <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 12, color: theme.tm }}>
              No results for "{q}"
            </div>
          )}
          {results.map((item, i) => {
            const showG = item.type !== lastG;
            lastG = item.type;
            return (
              <React.Fragment key={item.id}>
                {showG && (
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: theme.tm,
                      padding: "8px 16px 3px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {groupLabel[item.type] || item.type}
                  </div>
                )}
                <div
                  onClick={item.action}
                  onMouseEnter={() => setSel(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 12px",
                    margin: "0 4px",
                    borderRadius: theme.r10,
                    cursor: "pointer",
                    background: i === sel ? theme.sa : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  {item.appId ? (
                    <AppChip appId={item.appId} size={28} />
                  ) : (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: theme.r6,
                        background: theme.sa,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <I.ArrowR size={12} color={theme.ts} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: theme.tx,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: theme.tm,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.sub}
                    </div>
                  </div>
                  {i === sel && (
                    <kbd
                      style={{
                        fontSize: 9,
                        color: theme.tm,
                        background: theme.sa,
                        border: `1px solid ${theme.bd}`,
                        borderRadius: theme.r6,
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
