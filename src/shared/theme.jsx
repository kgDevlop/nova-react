
/**
 * @fileoverview Nova Office theme engine.
 *
 * Architecture notes
 * ------------------
 * - `_buildT`   is a pure function: (ThemeConfig) → TokenObject. No side effects.
 * - `TC`        is the React context. Consumers call `useT()` — never read TC directly.
 * - `ThemeProvider` is the single place state lives. Wrap the app root once.
 * - `ACCENT_PRESETS` and `APP_COLORS` are sourced from `_constants.js` and used
 *   in SettingsPanel and anywhere else that needs the palette.
 * - "system" mode reads `prefers-color-scheme` at build time (on first render).
 *   A media-query listener is intentionally NOT added here — keeping the engine
 *   stateless keeps it testable. If live system-mode switching is needed, add a
 *   `useEffect` listener inside ThemeProvider, not here.
 */

import React, { createContext, useContext, useMemo, useState } from "react";
import { theme as C } from "./_constants";

// ── Pure Token Builder ───────────────────────────────────────────────────────

/**
 * Resolves a ThemeConfig to a full TokenObject.
 * Pure function — safe to call outside React (e.g. in tests or SSR).
 *
 * @param {import('./modals/types').ThemeConfig} config
 * @returns {import('./modals/types').TokenObject}
 */
export function buildTokens(config) {
  // Resolve "system" against the current media query; otherwise honour the
  // explicit mode. SSR-safe: falls back to light when `window` is missing.
  let resolvedMode;
  if (config.mode === "system") {
    const hasWindow = typeof window !== "undefined";
    const prefersDark = hasWindow && window.matchMedia("(prefers-color-scheme: dark)").matches;
    resolvedMode = prefersDark ? "dark" : "light";
  } else {
    resolvedMode = config.mode;
  }

  const dk = resolvedMode !== "light";
  const ac = C.ACCENT_PRESETS.find(p => p.id === config.accentId) ?? C.ACCENT_PRESETS[0];

  return {
    // Backgrounds
    bg:      dk ? "#09090C" : "#F4F4F0",
    surface: dk ? "#0F0F14" : "#FFFFFF",
    sh:      dk ? "#141419" : "#F8F8F5",
    sa:      dk ? "#18181F" : "#EFEFEA",
    el:      dk ? "#1D1D26" : "#FFFFFF",
    // Borders
    bd:      dk ? "#1D1D28" : "#E4E4DC",
    bs:      dk ? "#28283A" : "#CACACC",
    // Accent
    ac:      ac.hex,
    as:      ac.soft,
    // Text
    tx:      dk ? "#EAEAF2" : "#111118",
    ts:      dk ? "#7878A0" : "#6060A0",
    tm:      dk ? "#3C3C52" : "#A8A8C0",
    // Semantic
    er:      "#E85252",
    // Radii
    r6:  "6px",
    r10: "10px",
    r14: "14px",
    r20: "20px",
    rF:  "9999px",
    // Typography
    fn:  '"Plus Jakarta Sans",system-ui,sans-serif',
    // Motion
    tr:  "0.18s cubic-bezier(0.4,0,0.2,1)",
    // Flag
    dk,
  };
}

// ── Context ──────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ThemeContextValue
 * @property {import('./modals/types').ThemeConfig}  theme
 * @property {import('./modals/types').TokenObject}  t
 * @property {React.Dispatch<React.SetStateAction<import('./modals/types').ThemeConfig>>} setTheme
 */

export const TC = createContext({
  theme:    C.DEFAULT_THEME,
  t:        buildTokens(C.DEFAULT_THEME),
  setTheme: () => {},
});

// ── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Returns the current design token object.
 * Triggers a re-render only when the theme changes.
 *
 * @returns {import('./modals/types').TokenObject}
 */
export const useT = () => useContext(TC).t;

/**
 * Returns `[theme, setTheme]` for components that need to mutate the theme
 * (e.g. SettingsPanel). Most components only need `useT()`.
 *
 * @returns {[import('./modals/types').ThemeConfig,
 *            React.Dispatch<React.SetStateAction<import('./modals/types').ThemeConfig>>]}
 */
export const useTheme = () => {
  const { theme, setTheme } = useContext(TC);
  return [theme, setTheme];
};

// ── Provider ─────────────────────────────────────────────────────────────────

/**
 * Wrap the app root exactly once.
 * Memoises token computation so child trees only re-render on actual changes.
 *
 * @param {{ children: React.ReactNode }} props
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(C.DEFAULT_THEME);

  /** @type {import('./modals/types').TokenObject} */
  const t = useMemo(() => buildTokens(theme), [theme]);

  return (
    <TC.Provider value={{ theme, t, setTheme }}>
      {children}
    </TC.Provider>
  );
}
