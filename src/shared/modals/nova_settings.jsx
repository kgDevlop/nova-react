import React, { useState } from "react";
import { I } from "../icons";
import { useT } from "../theme";
import { AppChip } from "../atoms";
import { useDeviceCaps } from "../hooks/system";
import { theme as themeC, registry } from "../_constants";

export const SettingsPanel = ({
  onClose,
  theme,
  setTheme,
  getAppColor,
  setAppColor,
  activeWS,
  mobileDisabled,
  setMobileDisabled,
  onShowShortcuts,
}) => {
  const t = useT();
  const device = useDeviceCaps();
  const isMobile = device.isMobile && !mobileDisabled;
  const [tab, setTab] = useState("appearance");

  const TABS = [
    { id: "appearance", l: "Appearance", I: I.Palette },
    { id: "apps", l: "App colours", I: I.Sparkles },
  ];

  const MODES = [
    ["dark", "Dark", I.Moon],
    ["light", "Light", I.Sun],
    ["system", "System", I.Monitor],
  ];

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
          maxWidth: isMobile ? "none" : 660,
          width: isMobile ? "100%" : undefined,
          height: isMobile ? "100%" : undefined,
          padding: 0,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          overflow: "hidden",
          maxHeight: isMobile ? "100%" : "86vh",
          position: "relative",
        }}
      >
        {isMobile ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "12px 14px",
              borderBottom: `1px solid ${t.bd}`,
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800, color: t.tx, flex: 1 }}>
              Settings
            </div>
            <button className="nb ni" style={{ padding: 6 }} onClick={onClose}>
              <I.X size={15} />
            </button>
          </div>
        ) : (
          /* ── Sidebar (desktop) ── */
          <div
            style={{
              width: 172,
              borderRight: `1px solid ${t.bd}`,
              padding: "18px 7px",
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: t.tx, padding: "3px 9px 14px" }}>
              Settings
            </div>
            {TABS.map(({ id, l, I: Ico }) => (
              <div
                key={id}
                className={`nnav ${tab === id ? "active" : ""}`}
                onClick={() => setTab(id)}
              >
                <Ico size={13} />
                <span style={{ fontSize: 11 }}>{l}</span>
              </div>
            ))}
          </div>
        )}

        {isMobile && (
          <div
            style={{
              display: "flex",
              gap: 6,
              padding: "10px 12px",
              borderBottom: `1px solid ${t.bd}`,
              flexShrink: 0,
              overflowX: "auto",
            }}
          >
            {TABS.map(({ id, l, I: Ico }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 12px",
                    borderRadius: t.rF,
                    border: `1px solid ${active ? t.ac + "66" : t.bd}`,
                    background: active ? t.as : "transparent",
                    color: active ? t.tx : t.ts,
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: t.fn,
                    cursor: "pointer",
                    flexShrink: 0,
                    outline: "none",
                  }}
                >
                  <Ico size={12} color={active ? t.ac : t.ts} />
                  {l}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Content ── */}
        <div style={{ flex: 1, padding: isMobile ? "16px 16px" : "22px 24px", overflowY: "auto" }}>
          {tab === "appearance" && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: t.tx, marginBottom: 3 }}>
                Appearance
              </h3>
              <p style={{ fontSize: 11, color: t.ts, marginBottom: 22 }}>
                Customise Nova's look and feel
              </p>

              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: t.tm,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 9,
                }}
              >
                Mode
              </div>
              <div style={{ display: "flex", gap: 7, marginBottom: 24 }}>
                {MODES.map(([id, l, Ico]) => {
                  const active = theme.mode === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setTheme(p => ({ ...p, mode: id }))}
                      style={{
                        flex: 1,
                        padding: "9px 7px",
                        borderRadius: t.r10,
                        cursor: "pointer",
                        border: `1px solid ${active ? t.ac + "66" : t.bd}`,
                        background: active ? t.as : "transparent",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 5,
                        transition: t.tr,
                        fontFamily: t.fn,
                        outline: "none",
                      }}
                    >
                      <Ico size={15} color={active ? t.ac : t.ts} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: active ? t.tx : t.ts }}>
                        {l}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: t.tm,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 9,
                }}
              >
                Accent colour
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 22 }}>
                {themeC.ACCENT_PRESETS.map(p => {
                  const active = theme.accentId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setTheme(th => ({ ...th, accentId: p.id }))}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        padding: "7px 9px",
                        borderRadius: t.r10,
                        cursor: "pointer",
                        border: `1px solid ${active ? p.hex + "66" : t.bd}`,
                        background: active ? p.soft : "transparent",
                        transition: t.tr,
                        fontFamily: t.fn,
                        outline: "none",
                      }}
                    >
                      <div style={{ width: 20, height: 20, borderRadius: t.rF, background: p.hex }} />
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          color: active ? t.tx : t.ts,
                          textTransform: "capitalize",
                        }}
                      >
                        {p.id}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: t.tm,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 9,
                }}
              >
                Layout
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "9px 11px",
                  borderRadius: t.r10,
                  border: `1px solid ${t.bd}`,
                  cursor: "pointer",
                  marginBottom: 22,
                }}
              >
                <input
                  type="checkbox"
                  checked={!!mobileDisabled}
                  onChange={e => setMobileDisabled?.(e.target.checked)}
                  style={{ cursor: "pointer", margin: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.tx }}>
                    Disable mobile site
                  </div>
                  <div style={{ fontSize: 10, color: t.ts, marginTop: 2 }}>
                    Always use the desktop layout, even on small screens.
                  </div>
                </div>
              </label>
            </div>
          )}

          {tab === "apps" && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: t.tx, marginBottom: 3 }}>
                App colours
              </h3>
              <p style={{ fontSize: 11, color: t.ts, marginBottom: 18 }}>
                Override the accent for each app in{" "}
                <strong style={{ color: t.tx }}>{activeWS.name}</strong>
              </p>
              {registry.APPS.map(app => {
                const cur = getAppColor(activeWS.id, app.id, app.dc);
                const isCustom = !themeC.APP_COLORS.includes(cur) && cur !== app.dc;
                return (
                  <div
                    key={app.id}
                    style={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      alignItems: isMobile ? "stretch" : "center",
                      gap: isMobile ? 8 : 10,
                      padding: "9px 0",
                      borderBottom: `1px solid ${t.bd}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <AppChip appId={app.id} size={32} colorOverride={cur} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: t.tx }}>{app.label}</div>
                        <div style={{ fontSize: 10, color: t.tm }}>{app.desc}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: isMobile ? 0 : "auto" }}>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap", maxWidth: isMobile ? "none" : 148 }}>
                      {themeC.APP_COLORS.slice(0, 8).map(c => (
                        <button
                          key={c}
                          onClick={() => setAppColor(activeWS.id, app.id, c)}
                          style={{
                            width: 17,
                            height: 17,
                            borderRadius: t.rF,
                            background: c,
                            cursor: "pointer",
                            border: `2px solid ${cur === c ? t.tx : "transparent"}`,
                            outline: "none",
                          }}
                        />
                      ))}
                    </div>
                    {/* Custom color picker — native input[type=color] */}
                    <label
                      title="Custom colour"
                      style={{ position: "relative", cursor: "pointer", flexShrink: 0 }}
                    >
                      <div
                        style={{
                          width: 17,
                          height: 17,
                          borderRadius: t.rF,
                          background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)",
                          cursor: "pointer",
                          border: `2px solid ${isCustom ? t.tx : "transparent"}`,
                          outline: "none",
                          overflow: "hidden",
                        }}
                      />
                      <input
                        type="color"
                        value={cur}
                        onChange={e => setAppColor(activeWS.id, app.id, e.target.value)}
                        style={{
                          position: "absolute",
                          opacity: 0,
                          width: "100%",
                          height: "100%",
                          top: 0,
                          left: 0,
                          cursor: "pointer",
                          padding: 0,
                          border: "none",
                        }}
                      />
                    </label>
                    {/* Reset to default */}
                    <button
                      title="Reset to default"
                      className="nb ni"
                      style={{
                        padding: 3,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        display: "flex",
                        opacity: 0.5,
                        flexShrink: 0,
                      }}
                      onClick={() => setAppColor(activeWS.id, app.id, app.dc)}
                    >
                      <I.Refresh size={11} />
                    </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Shortcuts link at the bottom of every tab */}
          <div style={{ marginTop: "auto", paddingTop: 20, borderTop: `1px solid ${t.bd}` }}>
            <button
              className="nb ng"
              style={{ width: "100%", fontSize: 11, justifyContent: "flex-start", gap: 8 }}
              onClick={() => {
                onShowShortcuts?.();
                onClose();
              }}
            >
              <I.Zap size={12} /> Keyboard shortcuts
              <kbd
                style={{
                  marginLeft: "auto",
                  fontSize: 9,
                  color: t.tm,
                  background: t.sa,
                  border: `1px solid ${t.bd}`,
                  borderRadius: t.r6,
                  padding: "1px 5px",
                  fontFamily: "monospace",
                }}
              >
                ⌘K
              </kbd>
            </button>
          </div>
        </div>

        {!isMobile && (
          <button
            className="nb ni"
            style={{ position: "absolute", top: 14, right: 14, padding: 6 }}
            onClick={onClose}
          >
            <I.X size={15} />
          </button>
        )}
      </div>
    </div>
  );
};
