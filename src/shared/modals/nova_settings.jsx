import React, { useState } from "react";
import { I } from "../icons";
import { useT, useCustomSchemes } from "../theme";
import { AppChip } from "../atoms";
import { useDeviceCaps } from "../hooks/system";
import { theme as themeConst, registry as registryConst } from "../_constants";
import { CustomSchemeModal } from "./custom_scheme";

export const SettingsPanel = ({
  onClose,
  theme,
  setTheme,
  getAppColor,
  setAppColor,
  delAppColor,
  activeWS,
  mobileDisabled,
  setMobileDisabled,
  onShowShortcuts,
}) => {
  const t = useT();
  const device = useDeviceCaps();
  const isMobile = device.isMobile && !mobileDisabled;
  const [tab, setTab] = useState("appearance");
  const { customSchemes, addCustomScheme, deleteCustomScheme } = useCustomSchemes();
  const [showCustomModal, setShowCustomModal] = useState(false);

  const activeSchemeId = theme.schemeId ?? "classic";
  const activeIsCustom = customSchemes.some(s => s.id === activeSchemeId);

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
                Colour scheme
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <select
                  value={activeSchemeId}
                  onChange={e => setTheme(p => ({ ...p, schemeId: e.target.value }))}
                  style={{
                    flex: 1,
                    background: t.surface,
                    border: `1px solid ${t.bd}`,
                    color: t.tx,
                    fontFamily: t.fn,
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: t.r10,
                    padding: "9px 16px 9px 11px",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <optgroup label="Built-in">
                    {themeConst.COLOR_SCHEMES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </optgroup>
                  {customSchemes.length > 0 && (
                    <optgroup label="Custom">
                      {customSchemes.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {activeIsCustom && (
                  <button
                    title="Delete this custom theme"
                    className="nb ni"
                    onClick={() => deleteCustomScheme(activeSchemeId)}
                    style={{ padding: "0 10px", flexShrink: 0 }}
                  >
                    <I.Trash size={13} />
                  </button>
                )}
                <button
                  title="Create a custom theme"
                  className="nb ng"
                  onClick={() => setShowCustomModal(true)}
                  style={{ padding: "0 10px", flexShrink: 0, fontSize: 11 }}
                >
                  <I.Plus size={13} /> New
                </button>
              </div>
              <p style={{ fontSize: 10, color: t.tm, marginBottom: 22 }}>
                <strong style={{ color: t.ts }}>Classic</strong> follows the mode above.
                Other schemes override the full palette.
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
              {registryConst.APPS.map(app => {
                const def = t.appColorFor(app.id);
                const cur = getAppColor(activeWS.id, app.id, def);
                const isOverridden = getAppColor(activeWS.id, app.id, null) != null;
                const isPreset = t.appColors.includes(cur);
                const isCustom = isOverridden && !isPreset;
                return (
                  <div
                    key={app.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 0",
                      borderBottom: `1px solid ${t.bd}`,
                    }}
                  >
                    <AppChip appId={app.id} size={28} colorOverride={cur} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: t.tx, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {app.label}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                      {t.appColors.slice(0, 8).map(c => (
                        <button
                          key={c}
                          onClick={() => setAppColor(activeWS.id, app.id, c)}
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: t.rF,
                            background: c,
                            cursor: "pointer",
                            border: `2px solid ${cur === c ? t.tx : "transparent"}`,
                            outline: "none",
                            padding: 0,
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
                          width: 16,
                          height: 16,
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
                    {/* Reset → clear the override so the row falls back to the theme accent. */}
                    <button
                      title="Reset to theme accent"
                      className="nb ni"
                      style={{
                        padding: 3,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        display: "flex",
                        opacity: isOverridden ? 0.7 : 0.25,
                        flexShrink: 0,
                      }}
                      onClick={() => delAppColor?.(activeWS.id, app.id)}
                      disabled={!isOverridden}
                    >
                      <I.Refresh size={11} />
                    </button>
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

      {showCustomModal && (
        <CustomSchemeModal
          onClose={() => setShowCustomModal(false)}
          onSave={scheme => {
            addCustomScheme(scheme);
            setTheme(p => ({ ...p, schemeId: scheme.id }));
          }}
        />
      )}
    </div>
  );
};
