import React from "react";
import { _elId } from "./utils";

export const SLIDE_THEMES = [
  { id: "white",   label: "White",   bg: "#FFFFFF", tx: "#1A1A2E", ac: "#4A8FE8", hd: "#111118" },
  { id: "dark",    label: "Dark",    bg: "#1A1A2E", tx: "#EAEAF2", ac: "#C8A253", hd: "#FFFFFF" },
  { id: "minimal", label: "Minimal", bg: "#F8F8F4", tx: "#2A2A3A", ac: "#3BB580", hd: "#111118" },
  { id: "bold",    label: "Bold",    bg: "#E87B3A", tx: "#FFFFFF", ac: "#FFFFFF", hd: "#FFFFFF" },
  { id: "ocean",   label: "Ocean",   bg: "#0F3460", tx: "#E0E0F0", ac: "#38BDF8", hd: "#FFFFFF" },
  { id: "forest",  label: "Forest",  bg: "#2D5016", tx: "#F0F4E8", ac: "#84CC16", hd: "#FFFFFF" },
];

// Create a blank slide with seed elements based on layout.
export const _mkSlide = (layout = "blank", theme = SLIDE_THEMES[0]) => {
  const id = _elId();

  if (layout === "title") {
    return {
      id,
      layout,
      bg: theme.bg,
      elements: [
        {
          id: _elId(), type: "text", x: 40, y: 140, w: 720, h: 80,
          text: "Click to add title", fontSize: 36, bold: true,
          color: theme.hd, align: "center", placeholder: true,
        },
        {
          id: _elId(), type: "text", x: 40, y: 240, w: 720, h: 50,
          text: "Click to add subtitle", fontSize: 20, bold: false,
          color: theme.tx, align: "center", placeholder: true,
        },
      ],
    };
  }

  if (layout === "content") {
    return {
      id,
      layout,
      bg: theme.bg,
      elements: [
        {
          id: _elId(), type: "text", x: 40, y: 30, w: 720, h: 60,
          text: "Slide Title", fontSize: 28, bold: true,
          color: theme.hd, align: "left", placeholder: false,
        },
        {
          id: _elId(), type: "text", x: 40, y: 110, w: 720, h: 260,
          text: "• Add your content here\n• Second point\n• Third point",
          fontSize: 16, bold: false, color: theme.tx, align: "left", placeholder: false,
        },
      ],
    };
  }

  if (layout === "twocol") {
    return {
      id,
      layout,
      bg: theme.bg,
      elements: [
        {
          id: _elId(), type: "text", x: 40, y: 30, w: 720, h: 60,
          text: "Slide Title", fontSize: 28, bold: true,
          color: theme.hd, align: "left", placeholder: false,
        },
        {
          id: _elId(), type: "text", x: 40, y: 110, w: 340, h: 240,
          text: "Left column content", fontSize: 15, bold: false,
          color: theme.tx, align: "left", placeholder: false,
        },
        {
          id: _elId(), type: "text", x: 420, y: 110, w: 340, h: 240,
          text: "Right column content", fontSize: 15, bold: false,
          color: theme.tx, align: "left", placeholder: false,
        },
      ],
    };
  }

  return { id, layout: "blank", bg: theme.bg, elements: [] };
};

// Resize handle dots on selected element.
export const SelectionHandles = ({ x, y, w, h, onResize }) => {
  const handles = [
    { id: "tl", cx: x,         cy: y         },
    { id: "tc", cx: x + w / 2, cy: y         },
    { id: "tr", cx: x + w,     cy: y         },
    { id: "ml", cx: x,         cy: y + h / 2 },
    { id: "mr", cx: x + w,     cy: y + h / 2 },
    { id: "bl", cx: x,         cy: y + h     },
    { id: "bc", cx: x + w / 2, cy: y + h     },
    { id: "br", cx: x + w,     cy: y + h     },
  ];

  return (
    <>
      {handles.map(handle => (
        <circle
          key={handle.id}
          cx={handle.cx}
          cy={handle.cy}
          r={5}
          fill="white"
          stroke="#4A8FE8"
          strokeWidth={1.5}
          style={{ cursor: "pointer" }}
          onMouseDown={e => {
            e.stopPropagation();
            onResize?.(handle.id, e);
          }}
        />
      ))}
    </>
  );
};
