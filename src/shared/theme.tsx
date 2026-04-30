
/**
 * @fileoverview Nova Office theme engine.
 *
 * Architecture notes
 * ------------------
 * - `_buildT`   is a pure function: (ThemeConfig) → TokenObject. No side effects.
 * - `TC`        is the React context. Consumers call `useT()` — never read TC directly.
 * - `ThemeProvider` is the single place state lives. Wrap the app root once.
 * - `ACCENT_PRESETS` and `APP_COLORS` are read-only constant arrays exported for
 *   use in SettingsPanel and anywhere else that needs the palette.
 * - "system" mode reads `prefers-color-scheme` at build time (on first render).
 *   A media-query listener is intentionally NOT added here — keeping the engine
 *   stateless keeps it testable. If live system-mode switching is needed, add a
 *   `useEffect` listener inside ThemeProvider, not here.
 */

import React, { createContext, useContext, useMemo, useState } from "react";


// ── Constants ────────────────────────────────────────────────────────────────

/**
 * All available accent presets.
 * @type {import('./modals/types').AccentPreset[]}
 */
export const ACCENT_PRESETS = [
  { id: "gold",    hex: "#C8A253", soft: "rgba(200,162,83,0.12)"   },
  { id: "violet",  hex: "#8B5CF6", soft: "rgba(139,92,246,0.12)"   },
  { id: "teal",    hex: "#14B8A6", soft: "rgba(20,184,166,0.12)"   },
  { id: "coral",   hex: "#F97316", soft: "rgba(249,115,22,0.12)"   },
  { id: "rose",    hex: "#FB7185", soft: "rgba(251,113,133,0.12)"  },
  { id: "sky",     hex: "#38BDF8", soft: "rgba(56,189,248,0.12)"   },
  { id: "lime",    hex: "#84CC16", soft: "rgba(132,204,22,0.12)"   },
  { id: "crimson", hex: "#EF4444", soft: "rgba(239,68,68,0.12)"    },
];

/**
 * Generic color palette used for app-color overrides and workspace colors.
 * @type {string[]}
 */
export const APP_COLORS = [
  "#4A8FE8", "#3BB580", "#E87B3A", "#A87BE8",
  "#F97316", "#14B8A6", "#FB7185", "#38BDF8",
  "#8B5CF6", "#EF4444", "#84CC16", "#F59E0B",
];

type ThemeConfig = { mode: "dark" | "light" | "system"; accentId: string };

const DEFAULT_THEME: ThemeConfig = { mode: "dark", accentId: "gold" };

// ── Pure Token Builder ───────────────────────────────────────────────────────

/**
 * Resolves a ThemeConfig to a full TokenObject.
 * Pure function — safe to call outside React (e.g. in tests or SSR).
 *
 * @param {import('./modals/types').ThemeConfig} config
 * @returns {import('./modals/types').TokenObject}
 */
export function buildTokens(config: ThemeConfig) {
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
  const ac = ACCENT_PRESETS.find(p => p.id === config.accentId) ?? ACCENT_PRESETS[0];

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

type TokenObject = ReturnType<typeof buildTokens>;
type ThemeContextValue = {
  theme: ThemeConfig;
  t: TokenObject;
  setTheme: React.Dispatch<React.SetStateAction<ThemeConfig>>;
};

export const TC = createContext<ThemeContextValue>({
  theme:    DEFAULT_THEME,
  t:        buildTokens(DEFAULT_THEME),
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
export const useTheme = (): [ThemeConfig, React.Dispatch<React.SetStateAction<ThemeConfig>>] => {
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
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);

  /** @type {import('./modals/types').TokenObject} */
  const t = useMemo(() => buildTokens(theme), [theme]);

  return (
    <TC.Provider value={{ theme, t, setTheme }}>
      {children}
    </TC.Provider>
  );
}
