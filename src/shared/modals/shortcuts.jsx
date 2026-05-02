import React from "react";
import { I } from "../icons";
import { useT } from "../theme";
import { shortcuts as shortcutsConst } from "../_constants";

export const ShortcutsModal = ({ onClose }) => {
  const theme = useT();

  return (
    <div
      className="novl"
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="nmod" style={{ maxWidth: 460 }}>
        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: theme.tx }}>Keyboard shortcuts</h3>
          <button className="nb ni" onClick={onClose}>
            <I.X size={15} />
          </button>
        </div>

        {/* ── Shortcut grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "1px 0", rowGap: 0 }}>
          {shortcutsConst.SHORTCUTS.map(([key, desc]) => (
            <React.Fragment key={key}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  padding: "6px 12px 6px 0",
                  borderBottom: `1px solid ${theme.bd}`,
                }}
              >
                <kbd
                  style={{
                    fontSize: 11,
                    color: theme.tx,
                    background: theme.sa,
                    border: `1px solid ${theme.bd}`,
                    borderRadius: theme.r6,
                    padding: "2px 7px",
                    fontFamily: "monospace",
                    whiteSpace: "nowrap",
                  }}
                >
                  {key}
                </kbd>
              </div>
              <div
                style={{
                  padding: "6px 0",
                  fontSize: 12,
                  color: theme.ts,
                  borderBottom: `1px solid ${theme.bd}`,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {desc}
              </div>
            </React.Fragment>
          ))}
        </div>

        <button className="nb ng" style={{ width: "100%", marginTop: 14 }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};
