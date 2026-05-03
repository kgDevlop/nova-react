
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

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { ThemeConstants } from "./_constants";

// ── Pure Token Builder ───────────────────────────────────────────────────────

/**
 * Resolves a ThemeConfig to a full TokenObject.
 * Pure function — safe to call outside React (e.g. in tests or SSR).
 *
 * @param {import('./modals/types').ThemeConfig} config
 * @param {{
 *   customSchemes?: any[],
 *   previewPalette?: any | null,
 * }} [opts]
 * @returns {import('./modals/types').TokenObject}
 */
export function buildTokens(config, opts = {}) {
  const { customSchemes = [], previewPalette = null } = opts;

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

  const isDark = resolvedMode !== "light";
  const accent = ThemeConstants.ACCENT_PRESETS.find(p => p.presetId === config.accentId) ?? ThemeConstants.ACCENT_PRESETS[0];

  // A non-classic colour scheme replaces the entire palette. mode + accent
  // remain in state so flipping back to "classic" restores them. Custom
  // schemes are searched after built-ins so a user-saved id always wins
  // its own lookup, and built-ins remain stable if a name collides.
  // `previewPalette` is a transient override used by the custom-theme
  // modal — when set, it bypasses any saved scheme so the user sees their
  // edits immediately without persisting half-finished schemes.
  const scheme =
    ThemeConstants.COLOR_SCHEMES.find(s => s.schemeId === config.schemeId) ??
    customSchemes.find(s => s.schemeId === config.schemeId);
  const palette = previewPalette ?? scheme?.palette;

  // Per-app palette: scheme can supply 8 themed colours; fall back to the
  // global APP_COLORS for Classic, or [accent×8] for custom/preview palettes
  // that have no explicit list.
  const accentColor = palette?.accent ?? accent.hex;
  let appColors;
  if (previewPalette) {
    appColors = Array(8).fill(accentColor);
  } else if (scheme?.appColors) {
    appColors = scheme.appColors;
  } else if (palette) {
    appColors = Array(8).fill(accentColor);
  } else {
    appColors = ThemeConstants.APP_COLORS.slice(0, 8);
  }
  // Resolve a default colour for a given app id by looking up its index in
  // the registry. Falls back to the first slot for unknown ids.
  const appColorFor = appId => {
    const idx = ThemeConstants.APPS.findIndex(a => a.appId === appId);
    return appColors[(idx < 0 ? 0 : idx) % appColors.length];
  };

  return {
    // Backgrounds
    bg:           palette?.bg           ?? (isDark ? "#09090C" : "#F4F4F0"),
    surface:      palette?.surface      ?? (isDark ? "#0F0F14" : "#FFFFFF"),
    surfaceShade: palette?.surfaceShade ?? (isDark ? "#141419" : "#F8F8F5"),
    surfaceAlt:   palette?.surfaceAlt   ?? (isDark ? "#18181F" : "#EFEFEA"),
    elevated:     palette?.elevated     ?? (isDark ? "#1D1D26" : "#FFFFFF"),
    // Borders
    border:       palette?.border       ?? (isDark ? "#1D1D28" : "#E4E4DC"),
    borderStrong: palette?.borderStrong ?? (isDark ? "#28283A" : "#CACACC"),
    // Accent
    accent:       palette?.accent       ?? accent.hex,
    accentSoft:   palette?.accentSoft   ?? accent.softHex,
    // Text
    text:         palette?.text         ?? (isDark ? "#EAEAF2" : "#111118"),
    textDim:      palette?.textDim      ?? (isDark ? "#7878A0" : "#6060A0"),
    textMuted:    palette?.textMuted    ?? (isDark ? "#3C3C52" : "#A8A8C0"),
    // Per-app palette (theme-driven defaults for app accents)
    appColors,
    appColorFor,
    // Semantic
    error:      "#E85252",
    // Radii
    r6:  "6px",
    r10: "10px",
    r14: "14px",
    r20: "20px",
    rF:  "9999px",
    // Typography
    fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif',
    // Motion
    transition: "0.18s cubic-bezier(0.4,0,0.2,1)",
    // Flag
    isDark:     palette?.isDark ?? isDark,
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
  theme:              ThemeConstants.DEFAULT_THEME,
  t:                  buildTokens(ThemeConstants.DEFAULT_THEME),
  setTheme:           () => {},
  customSchemes:      [],
  addCustomScheme:    () => {},
  deleteCustomScheme: () => {},
  previewPalette:     null,
  setPreviewPalette:  () => {},
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

/**
 * Returns the user-created colour schemes plus mutation helpers. Used by the
 * settings panel to render the "Create custom theme" UI.
 */
export const useCustomSchemes = () => {
  const { customSchemes, addCustomScheme, deleteCustomScheme } = useContext(TC);
  return { customSchemes, addCustomScheme, deleteCustomScheme };
};

/**
 * Transient palette override — used by the custom-theme modal to drive live
 * preview without persisting partial schemes. Setting `null` reverts to the
 * underlying applied theme.
 */
export const usePreviewPalette = () => {
  const { previewPalette, setPreviewPalette } = useContext(TC);
  return { previewPalette, setPreviewPalette };
};

// ── Provider ─────────────────────────────────────────────────────────────────

// localStorage round-trips. Wrapped so SSR / disabled-storage environments
// degrade to defaults instead of crashing on first render.
const _loadTheme = () => {
  try {
    const raw = localStorage.getItem(ThemeConstants.THEME_KEY);
    if (!raw) {
      return ThemeConstants.DEFAULT_THEME;
    }
    const parsed = JSON.parse(raw);
    return { ...ThemeConstants.DEFAULT_THEME, ...parsed };
  } catch {
    return ThemeConstants.DEFAULT_THEME;
  }
};

const _loadCustomSchemes = () => {
  try {
    const raw = localStorage.getItem(ThemeConstants.CUSTOM_SCHEMES_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Wrap the app root exactly once.
 * Memoises token computation so child trees only re-render on actual changes.
 *
 * @param {{ children: React.ReactNode }} props
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(_loadTheme);
  const [customSchemes, setCustomSchemes] = useState(_loadCustomSchemes);
  // Transient — never persisted.
  const [previewPalette, setPreviewPalette] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(ThemeConstants.THEME_KEY, JSON.stringify(theme));
    } catch {
      // Ignore quota / availability errors — the theme just won't persist.
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(ThemeConstants.CUSTOM_SCHEMES_KEY, JSON.stringify(customSchemes));
    } catch {
      // Ignore — same as above.
    }
  }, [customSchemes]);

  const addCustomScheme = useCallback(scheme => {
    setCustomSchemes(p => [...p.filter(s => s.schemeId !== scheme.schemeId), scheme]);
  }, []);

  const deleteCustomScheme = useCallback(schemeId => {
    setCustomSchemes(p => p.filter(s => s.schemeId !== schemeId));
    // If the deleted scheme was active, fall back to "classic" so the UI
    // doesn't end up showing a vanished selection.
    setTheme(p => (p.schemeId === schemeId ? { ...p, schemeId: "classic" } : p));
  }, []);

  /** @type {import('./modals/types').TokenObject} */
  const t = useMemo(
    () => buildTokens(theme, { customSchemes, previewPalette }),
    [theme, customSchemes, previewPalette],
  );

  const value = useMemo(
    () => ({
      theme, t, setTheme,
      customSchemes, addCustomScheme, deleteCustomScheme,
      previewPalette, setPreviewPalette,
    }),
    [theme, t, customSchemes, addCustomScheme, deleteCustomScheme, previewPalette],
  );

  return <TC.Provider value={value}>{children}</TC.Provider>;
}
