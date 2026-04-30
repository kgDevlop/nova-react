import React, { useState, useEffect, useRef } from "react";
import { I } from "../icons";
import { useT } from "../theme";
import { AppChip } from "../atoms";
import { _autoName } from "../utils";
import { APPS, _app } from "../../shell/registry";

// Calendar is a singleton per workspace — it is never created from this modal.
const CREATABLE_APPS = APPS.filter(a => a.id !== "calendar");

export const NewDocModal = ({ onClose, onCreate, initType, getAppColor, activeWS }) => {
  const theme = useT();
  const [type, setType] = useState(initType || "writer");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Guarded so a double-click / Enter-spam can't fire onCreate twice before
  // the modal closes.
  const create = () => {
    if (creating) {
      return;
    }
    setCreating(true);
    try {
      const color = getAppColor(activeWS.id, type, _app(type).dc);
      onCreate(type, title, color);
    } catch (err) {
      console.error("Nova: doc create failed", err);
    } finally {
      onClose();
    }
  };

  const def = _app(type);
  const currentColor = getAppColor(activeWS.id, type, def.dc);
  const autoPreview = _autoName(type);

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
        className="nmod"
        style={{
          width: 580,
          maxWidth: "calc(100vw - 32px)",
          padding: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Header ── */}
        <div style={{ padding: "18px 22px 0", borderBottom: `1px solid ${theme.bd}`, flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: theme.tx, letterSpacing: "-0.02em" }}>
                New document
              </h2>
              <p style={{ fontSize: 13, color: theme.tx, marginTop: 2, opacity: 0.75 }}>
                Choose a type — name auto-fills with today's date
              </p>
            </div>
            <button className="nb ni" onClick={onClose}>
              <I.X size={15} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 0 }}>
            <div
              style={{
                padding: "6px 13px",
                fontSize: 13,
                fontWeight: 700,
                color: theme.tx,
                borderBottom: `2px solid ${theme.ac}`,
                whiteSpace: "nowrap",
                textTransform: "capitalize",
              }}
            >
              all
            </div>
          </div>
        </div>

        {/* ── App grid ── */}
        <div
          style={{
            padding: "13px 22px",
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 7,
            flexShrink: 0,
          }}
        >
          {CREATABLE_APPS.map(app => {
            const selected = type === app.id;
            const color = getAppColor(activeWS.id, app.id, app.dc);
            return (
              <div
                key={app.id}
                onClick={() => setType(app.id)}
                style={{
                  padding: "11px 11px",
                  borderRadius: theme.r14,
                  cursor: "pointer",
                  border: `1px solid ${selected ? color + "AA" : color + "33"}`,
                  background: selected
                    ? color + (theme.dk ? "40" : "33")
                    : color + (theme.dk ? "14" : "10"),
                  transition: theme.tr,
                  position: "relative",
                }}
              >
                <AppChip appId={app.id} size={30} colorOverride={color} />
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.tx, marginTop: 7, marginBottom: 2 }}>
                  {app.label}
                </div>
                <div style={{ fontSize: 12, color: theme.tx, opacity: 0.8, lineHeight: 1.4 }}>
                  {app.desc.slice(0, 36)}…
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Name + actions ── */}
        <div
          style={{
            padding: "12px 22px 18px",
            borderTop: `1px solid ${theme.bd}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <AppChip appId={type} size={30} colorOverride={currentColor} />
          <input
            ref={inputRef}
            className="ninput"
            style={{ flex: 1 }}
            placeholder={autoPreview}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                create();
              }
              if (e.key === "Escape") {
                onClose();
              }
            }}
          />
          <button className="nb ng" onClick={onClose}>
            Cancel
          </button>
          <button className="nb np" onClick={create}>
            <I.Plus size={13} /> Create
          </button>
        </div>
      </div>
    </div>
  );
};
