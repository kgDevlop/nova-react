import React from "react";

// Recursively turn a plain-object spec tree into JSX.
// Spec ::= null | false | string | number | spec[] | { tag, children?, key?, ...props }
// `tag` may be a string ("g", "rect", ...) or a React component.
export const renderSpec = (s) => {
  if (s == null || s === false) return null;
  if (typeof s === "string" || typeof s === "number") return s;
  if (Array.isArray(s)) return s.map(renderSpec);
  const { tag, children, key, ...rest } = s;
  const kids = children == null
    ? null
    : Array.isArray(children) ? children.map(renderSpec) : renderSpec(children);
  return React.createElement(tag, { key, ...rest }, kids);
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
