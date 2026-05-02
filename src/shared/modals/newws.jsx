import React, { useState, useRef, useEffect } from "react";
import { I } from "../icons";
import { useT } from "../theme";
import { newws, theme } from "../_constants";

export const NewWSModal = ({ onClose, onCreate }) => {
  const theme = useT();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [color, setColor] = useState("#4A8FE8");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Single create path — wrapped in try/finally so the modal still closes
  // if the parent throws while persisting.
  const submit = () => {
    if (!name.trim()) {
      return;
    }
    try {
      onCreate(name, emoji, color);
    } finally {
      onClose();
    }
  };

  return (
    <div
      className="novl"
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="nmod" style={{ maxWidth: 440 }}>
        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: theme.tx, letterSpacing: "-0.02em" }}>
              New workspace
            </h2>
            <p style={{ fontSize: 11, color: theme.ts, marginTop: 2 }}>
              Group related documents together
            </p>
          </div>
          <button className="nb ni" onClick={onClose}>
            <I.X size={15} />
          </button>
        </div>

        {/* ── Icon ── */}
        <label
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: theme.ts,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            display: "block",
            marginBottom: 7,
          }}
        >
          Icon{" "}
          <span style={{ textTransform: "none", letterSpacing: 0, color: theme.tm, fontWeight: 500 }}>
            (optional)
          </span>
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 16 }}>
          <button
            onClick={() => setEmoji("")}
            title="No icon"
            style={{
              width: 32,
              height: 32,
              borderRadius: theme.r6,
              border: `1px solid ${emoji === "" ? theme.ac + "88" : theme.bd}`,
              background: emoji === "" ? theme.as : "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <I.X size={11} color={theme.tm} />
          </button>
          {newws.EMOJIS.map(em => (
            <button
              key={em}
              onClick={() => setEmoji(em)}
              style={{
                width: 32,
                height: 32,
                borderRadius: theme.r6,
                border: `1px solid ${emoji === em ? theme.ac + "88" : theme.bd}`,
                background: emoji === em ? theme.as : "transparent",
                cursor: "pointer",
                fontSize: 15,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {em}
            </button>
          ))}
        </div>

        {/* ── Name ── */}
        <label
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: theme.ts,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            display: "block",
            marginBottom: 7,
          }}
        >
          Name
        </label>
        <input
          ref={inputRef}
          className="ninput"
          placeholder="My workspace"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && name.trim()) {
              submit();
            }
            if (e.key === "Escape") {
              onClose();
            }
          }}
          style={{ marginBottom: 16 }}
        />

        {/* ── Colour ── */}
        <label
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: theme.ts,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            display: "block",
            marginBottom: 7,
          }}
        >
          Colour
        </label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 22 }}>
          {theme.APP_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 26,
                height: 26,
                borderRadius: theme.rF,
                background: c,
                cursor: "pointer",
                border: `2px solid ${color === c ? theme.tx : "transparent"}`,
                outline: "none",
              }}
            />
          ))}
        </div>

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: 7, justifyContent: "flex-end" }}>
          <button className="nb ng" onClick={onClose}>
            Cancel
          </button>
          <button
            className="nb np"
            onClick={submit}
            style={{ opacity: name.trim() ? 1 : 0.5 }}
          >
            <I.Plus size={13} /> Create workspace
          </button>
        </div>
      </div>
    </div>
  );
};
