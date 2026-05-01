import React from "react";
import { useT } from "./theme";
import { registry } from "./_utils";

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
        transition: cols ? "grid-template-columns 0.45s cubic-bezier(0.22, 1, 0.36, 1)" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const AppChip = ({ appId, size = 36, colorOverride }) => {
  const theme = useT();
  const def = registry._app(appId);
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

export const NovaLogo = ({ compact, workspace }) => {
  const theme = useT();
  const monogramColor = theme.dk ? "#09060A" : "#fff";

  // When a workspace is provided, swap the brand mark for the workspace's
  // initial + name. Mobile uses this so the active workspace is the primary
  // identity on screen instead of generic "Nova".
  const label = workspace?.name || "Nova";
  const monogram = (workspace?.name?.[0] || "N").toUpperCase();
  const bg = workspace?.color || theme.ac;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: theme.r10,
          background: bg,
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
          {monogram}
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
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
};
