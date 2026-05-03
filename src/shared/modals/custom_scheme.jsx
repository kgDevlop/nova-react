import React, { useState, useRef, useEffect } from "react";
import { I } from "../icons";
import { useT, usePreviewPalette } from "../theme";
import { utils } from "../_utils";

// ── Colour helpers ──────────────────────────────────────────────────────────

const _toRgb = hex => {
  const h = (hex || "").replace("#", "");
  const n = h.length === 3
    ? h.split("").map(c => c + c).join("")
    : h.padEnd(6, "0").slice(0, 6);
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ];
};

const _rgba = (hex, alpha) => {
  const [r, g, b] = _toRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

// `t.text` / `t.border` etc. may already be valid hex from buildTokens;
// `accentSoft` is the only token that's stored as rgba(). Coerce non-hex
// values to a sensible hex so input[type=color] doesn't reject them.
const _asHex = v => (typeof v === "string" && v.startsWith("#") ? v : "#000000");

// All eleven user-tunable palette tokens. `accentSoft` is auto-derived
// from `accent` because input[type=color] can't express alpha.
const FIELDS = [
  { key: "bg",           label: "Background"     },
  { key: "surface",      label: "Surface"        },
  { key: "surfaceShade", label: "Shade 1"        },
  { key: "surfaceAlt",   label: "Shade 2"        },
  { key: "elevated",     label: "Elevated"       },
  { key: "border",       label: "Border"         },
  { key: "borderStrong", label: "Strong border"  },
  { key: "accent",       label: "Accent"         },
  { key: "text",         label: "Text primary"   },
  { key: "textDim",      label: "Text secondary" },
  { key: "textMuted",    label: "Text muted"     },
];

// ── Modal ────────────────────────────────────────────────────────────────────

export const CustomSchemeModal = ({ onClose, onSave }) => {
  // Snapshot the current token object once on mount so the seed values don't
  // shift while the user is editing (the live `t` mutates as preview updates).
  const tLive = useT();
  const tSeedRef = useRef(tLive);
  const t = tSeedRef.current;
  const { setPreviewPalette } = usePreviewPalette();

  const [name, setName] = useState("My theme");
  const [isDark, setIsDark] = useState(!!t.isDark);
  const [colors, setColors] = useState(() =>
    Object.fromEntries(FIELDS.map(f => [f.key, _asHex(t[f.key])])),
  );
  const inputRef = useRef(null);

  // Build the full palette payload from local state. `accentSoft` is
  // auto-derived from `accent` so it stays in sync with whatever the user picks.
  const palette = {
    ...colors,
    accentSoft: _rgba(colors.accent, 0.14),
    isDark,
  };

  // Push every change to the live preview so the whole UI updates as the
  // user moves sliders. Cleared on unmount → reverts to the underlying
  // applied theme (this is what makes Cancel / Esc / backdrop-click work).
  useEffect(() => {
    setPreviewPalette(palette);
  }, [palette.bg, palette.surface, palette.surfaceShade, palette.surfaceAlt, palette.elevated,
      palette.border, palette.borderStrong, palette.accent, palette.text, palette.textDim, palette.textMuted,
      palette.isDark]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => setPreviewPalette(null), [setPreviewPalette]);

  // Esc closes (and the unmount effect above reverts the preview).
  useEffect(() => {
    const onKey = e => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submit = () => {
    if (!name.trim()) {
      return;
    }
    onSave({
      schemeId: `custom_${utils._uid()}`,
      label: name.trim(),
      custom: true,
      palette,
    });
    // Don't clear preview here — the parent will switch schemeId to the new
    // saved scheme, so the colours stay identical when the modal unmounts.
    onClose();
  };

  const setColor = (k, v) => setColors(p => ({ ...p, [k]: v }));

  return (
    <div
      className="novl"
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="nmod" style={{ maxWidth: 500 }}>
        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: t.text, letterSpacing: "-0.02em" }}>
              Create custom theme
            </h2>
            <p style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>
              Edit any colour — the app updates live. Cancel or press Esc to revert.
            </p>
          </div>
          <button className="nb ni" onClick={onClose}>
            <I.X size={15} />
          </button>
        </div>

        {/* ── Name + base mode ── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <label
              style={{
                fontSize: 10, fontWeight: 700, color: t.textDim,
                letterSpacing: "0.05em", textTransform: "uppercase",
                display: "block", marginBottom: 7,
              }}
            >
              Name
            </label>
            <input
              ref={inputRef}
              className="ninput"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && name.trim()) submit();
              }}
            />
          </div>
          <div style={{ width: 150 }}>
            <label
              style={{
                fontSize: 10, fontWeight: 700, color: t.textDim,
                letterSpacing: "0.05em", textTransform: "uppercase",
                display: "block", marginBottom: 7,
              }}
            >
              Base mode
            </label>
            <div style={{ display: "flex", gap: 5 }}>
              {[["dark", "Dark"], ["light", "Light"]].map(([k, l]) => {
                const active = (k === "dark") === isDark;
                return (
                  <button
                    key={k}
                    onClick={() => setIsDark(k === "dark")}
                    style={{
                      flex: 1,
                      padding: "8px 6px",
                      borderRadius: t.r10,
                      cursor: "pointer",
                      border: `1px solid ${active ? t.accent + "66" : t.border}`,
                      background: active ? t.accentSoft : "transparent",
                      color: active ? t.text : t.textDim,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: t.fontFamily,
                      outline: "none",
                    }}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Palette grid ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            marginBottom: 18,
          }}
        >
          {FIELDS.map(f => (
            <label
              key={f.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 9px",
                borderRadius: t.r10,
                border: `1px solid ${t.border}`,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: t.r6,
                  background: colors[f.key],
                  border: `1px solid ${t.border}`,
                  flexShrink: 0,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <input
                  type="color"
                  value={colors[f.key]}
                  onChange={e => setColor(f.key, e.target.value)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    cursor: "pointer",
                    border: "none",
                    padding: 0,
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: t.text }}>{f.label}</div>
                <div style={{ fontSize: 9, color: t.textMuted, fontFamily: "monospace" }}>
                  {colors[f.key].toUpperCase()}
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: 7, justifyContent: "flex-end" }}>
          <button className="nb ng" onClick={onClose}>Cancel</button>
          <button
            className="nb np"
            onClick={submit}
            style={{ opacity: name.trim() ? 1 : 0.5 }}
          >
            <I.Check size={13} /> Save theme
          </button>
        </div>
      </div>
    </div>
  );
};
