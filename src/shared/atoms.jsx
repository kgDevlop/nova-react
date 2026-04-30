import React from "react";
import { useT } from "./theme";
import { _app } from "../shell/registry";

// Card grid container. Pass `cols` for a fixed column count (paired with a
// slider/control that drives it), or `min` for an auto-fill grid that floors
// each column at that pixel width.
export const TileGrid = ({ children, cols, min = 196, gap = 9, gridRef, style }) => {
  // For fixed-cols mode, expand the track list explicitly so browsers can
  // interpolate `grid-template-columns` when `cols` changes (CSS transitions
  // on `repeat(N,1fr)` only animate when the resolved track lists differ in
  // count, which they do here). Auto-fill mode skips the transition since
  // its track count is layout-driven, not state-driven.
  const useTracks = cols
    ? Array.from({ length: cols }, () => "1fr").join(" ")
    : `repeat(auto-fill,minmax(${min}px,1fr))`;
  return (
    <div
      ref={gridRef}
      style={{
        display: "grid",
        gridTemplateColumns: useTracks,
        gap,
        transition: cols ? "grid-template-columns 0.35s ease" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const AppChip = ({ appId, size = 36, colorOverride }) => {
  const theme = useT();
  const def = _app(appId);
  const color = colorOverride || def.dc;
  // Tint background with a low-opacity overlay of the app color.
  const bgTint = color + (theme.dk ? "1A" : "22");

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: theme.r10,
        background: bgTint,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <def.Icon size={size * 0.44} color={color} />
    </div>
  );
};

export const NovaLogo = ({ compact }) => {
  const theme = useT();
  const monogramColor = theme.dk ? "#09060A" : "#fff";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: theme.r10,
          background: theme.ac,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: monogramColor,
            fontFamily: theme.fn,
          }}
        >
          N
        </span>
      </div>
      {!compact && (
        <span
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: theme.tx,
            whiteSpace: "nowrap",
            letterSpacing: "-0.01em",
          }}
        >
          Nova
        </span>
      )}
    </div>
  );
};
