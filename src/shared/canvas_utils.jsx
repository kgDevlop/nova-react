import React from "react";

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
