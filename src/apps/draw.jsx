import React, { useState, useEffect, useRef } from "react";
import { I } from "../shared/icons";
import { useCanvasHistory } from "../shared/hooks/system";
import { SelectionHandles, renderSpec } from "../shared/canvas_utils";
import { DrawConstants } from "../shared/_constants";
import { utils } from "../shared/_utils";

// In-progress preview: dashed shapes while the user is dragging out a new one.
const PREVIEW_SHAPES = {
  rect: (d, c) => ({
    tag: "rect",
    x: Math.min(d.x1, d.x2), y: Math.min(d.y1, d.y2),
    width: Math.abs(d.x2 - d.x1), height: Math.abs(d.y2 - d.y1),
    fill: c.fill, stroke: c.stroke, strokeWidth: c.strokeW,
    strokeDasharray: "4 2",
  }),
  ellipse: (d, c) => ({
    tag: "ellipse",
    cx: (d.x1 + d.x2) / 2, cy: (d.y1 + d.y2) / 2,
    rx: Math.abs(d.x2 - d.x1) / 2, ry: Math.abs(d.y2 - d.y1) / 2,
    fill: c.fill, stroke: c.stroke, strokeWidth: c.strokeW,
    strokeDasharray: "4 2",
  }),
  line: (d, c) => ({
    tag: "line",
    x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2,
    stroke: c.stroke, strokeWidth: c.strokeW,
    strokeDasharray: "4 2",
  }),
  pen: (d, c) => d.pts && {
    tag: "path",
    d: c.ptsToPath(d.pts),
    fill: "none",
    stroke: c.stroke, strokeWidth: c.strokeW,
    strokeLinecap: "round", strokeLinejoin: "round",
  },
};

// Persisted elements: each entry yields a tree (group + shape + selection chrome).
const DRAW_SHAPES = {
  rect: (el, c) => ({
    tag: "g", key: el.id,
    onMouseDown: e => c.onElMouseDown(el, e),
    style: { cursor: c.cursor },
    children: [
      { tag: "rect",
        x: el.x, y: el.y, width: el.w, height: el.h,
        fill: el.fill || "transparent",
        stroke: el.stroke || "#888",
        strokeWidth: el.strokeW || 2,
        rx: el.rx || 0 },
      c.isSel && { tag: "rect", key: "sel",
        x: el.x - DrawConstants.SELECTION_PAD,
        y: el.y - DrawConstants.SELECTION_PAD,
        width: el.w + DrawConstants.SELECTION_PAD * 2,
        height: el.h + DrawConstants.SELECTION_PAD * 2,
        fill: "none", stroke: "#4A8FE8",
        strokeWidth: 1.5, strokeDasharray: "4 2" },
      c.isSel && { tag: SelectionHandles, key: "h",
        x: el.x, y: el.y, w: el.w, h: el.h },
    ],
  }),

  ellipse: (el, c) => ({
    tag: "g", key: el.id,
    onMouseDown: e => c.onElMouseDown(el, e),
    style: { cursor: c.cursor },
    children: [
      { tag: "ellipse",
        cx: el.x + el.w / 2, cy: el.y + el.h / 2,
        rx: el.w / 2, ry: el.h / 2,
        fill: el.fill || "transparent",
        stroke: el.stroke || "#888",
        strokeWidth: el.strokeW || 2 },
      c.isSel && { tag: "rect", key: "sel",
        x: el.x - DrawConstants.SELECTION_PAD,
        y: el.y - DrawConstants.SELECTION_PAD,
        width: el.w + DrawConstants.SELECTION_PAD * 2,
        height: el.h + DrawConstants.SELECTION_PAD * 2,
        fill: "none", stroke: "#4A8FE8",
        strokeWidth: 1.5, strokeDasharray: "4 2" },
      c.isSel && { tag: SelectionHandles, key: "h",
        x: el.x, y: el.y, w: el.w, h: el.h },
    ],
  }),

  line: (el, c) => ({
    tag: "g", key: el.id,
    onMouseDown: e => c.onElMouseDown(el, e),
    style: { cursor: c.cursor },
    children: [
      { tag: "line",
        x1: el.x1, y1: el.y1, x2: el.x2, y2: el.y2,
        stroke: el.stroke || "#888",
        strokeWidth: el.strokeW || 2,
        strokeLinecap: "round" },
      // Translucent thicker overlay acts as the "selected" indicator for lines —
      // a bounding box around a thin line looks odd.
      c.isSel && { tag: "line", key: "sel",
        x1: el.x1, y1: el.y1, x2: el.x2, y2: el.y2,
        stroke: "#4A8FE8",
        strokeWidth: (el.strokeW || 2) + 6,
        strokeOpacity: 0.25,
        strokeLinecap: "round" },
    ],
  }),

  pen: (el, c) => ({
    tag: "path", key: el.id,
    d: c.ptsToPath(el.pts),
    fill: el.fill || "none",
    stroke: el.stroke || "#888",
    strokeWidth: el.strokeW || 2,
    strokeLinecap: "round", strokeLinejoin: "round",
    onMouseDown: e => c.onElMouseDown(el, e),
    style: { cursor: c.cursor },
  }),

  // Text uses a foreignObject so we can leverage native contentEditable for
  // inline editing — pure SVG text doesn't support that.
  text: (el, c) => {
    const boxHeight = Math.max(el.h, 40);
    return {
      tag: "g", key: el.id,
      onMouseDown: e => c.onElMouseDown(el, e),
      children: [
        { tag: "foreignObject",
          x: el.x, y: el.y, width: el.w, height: boxHeight,
          style: { overflow: "visible", cursor: c.cursor },
          children: {
            tag: "div",
            contentEditable: c.isEdit,
            suppressContentEditableWarning: true,
            onDoubleClick: e => {
              e.stopPropagation();
              if (c.tool === "select") c.setEditId(el.id);
            },
            onBlur: e => {
              c.hist.push(c.elements.map(x => {
                if (x.id === el.id) return { ...x, text: e.target.innerText };
                return x;
              }));
              c.setEditId(null);
            },
            style: {
              fontFamily: c.theme.fontFamily,
              fontSize: el.fontSize,
              fontWeight: el.bold ? 700 : 400,
              color: el.color,
              textAlign: el.align,
              lineHeight: 1.4,
              outline: c.isEdit ? "2px solid #4A8FE8" : "none",
              padding: c.isEdit ? "4px" : 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: c.isEdit ? "rgba(255,255,255,0.05)" : "transparent",
              minHeight: 30,
            },
            children: el.text,
          },
        },
        c.isSel && { tag: "rect", key: "sel",
          x: el.x - DrawConstants.TEXT_SELECTION_PAD,
          y: el.y - DrawConstants.TEXT_SELECTION_PAD,
          width: el.w + DrawConstants.TEXT_SELECTION_PAD * 2,
          height: boxHeight + DrawConstants.TEXT_SELECTION_PAD * 2,
          fill: "none", stroke: "#4A8FE8",
          strokeWidth: 1.5, strokeDasharray: "4 2" },
        c.isSel && !c.isEdit && { tag: SelectionHandles, key: "h",
          x: el.x, y: el.y, w: el.w, h: boxHeight },
      ],
    };
  },
};

export const DrawEditor = ({ appColor, doc, t: theme, onContentChange, registerActions }) => {
  // ── Initial doc load ──────────────────────────────────────────────────────
  // Parse the persisted JSON doc once on mount; tolerate corrupt/empty content.
  // Older docs (no `layers`) are migrated by funneling all elements onto a
  // single default layer.
  const initDoc = () => {
    let parsed = {};
    try {
      parsed = JSON.parse(doc.content || "{}");
    } catch {
      // Ignore parse errors — start fresh.
    }
    const defaultLayerId = "L0";
    const layers = parsed.layers && parsed.layers.length > 0
      ? parsed.layers
      : [{ id: defaultLayerId, name: "Layer 1" }];
    const fallbackId = layers[0].id;
    const elements = (parsed.elements || []).map(el => (
      el.layerId ? el : { ...el, layerId: fallbackId }
    ));
    const activeLayerId = parsed.activeLayerId && layers.some(L => L.id === parsed.activeLayerId)
      ? parsed.activeLayerId
      : layers[layers.length - 1].id;
    return { elements, layers, activeLayerId };
  };

  const initial = initDoc();
  const hist = useCanvasHistory(initial.elements);
  const elements = hist.current;
  const [layers, setLayers] = useState(initial.layers);
  const [activeLayerId, setActiveLayerId] = useState(initial.activeLayerId);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [tool, setTool] = useState("select");
  const [selId, setSelId] = useState(null);
  const [editId, setEditId] = useState(null);
  // In-progress drawing: { type, x1, y1, x2, y2, pts: [] }
  const [drawing, setDrawing] = useState(null);
  // In-progress drag: { id, startX, startY, origX, origY, ... }
  const [dragging, setDragging] = useState(null);
  // Live preview of elements during a drag — committed on mouseup.
  const [dragEls, setDragEls] = useState(null);
  const elementsView = dragEls || elements;
  // Render order respects layer order (z-stacking): layer 1 elements render
  // first (bottom), layer N last (top). Within a layer, insertion order wins.
  // Stragglers without a known layerId fall through to the end so they stay
  // visible even if their layer was removed.
  const orderedElements = (() => {
    const known = new Set(layers.map(L => L.id));
    const orphans = elementsView.filter(el => !known.has(el.layerId));
    return [
      ...layers.flatMap(L => elementsView.filter(el => el.layerId === L.id)),
      ...orphans,
    ];
  })();

  const svgRef = useRef(null);

  const [fill, setFill] = useState(appColor + "55");
  const [stroke, setStroke] = useState(appColor);
  const [strokeW, setStrokeW] = useState(2);

  // Push the serialized canvas up whenever elements or layers change.
  useEffect(() => {
    onContentChange(JSON.stringify({ elements, layers, activeLayerId }));
  }, [elements, layers, activeLayerId]); // eslint-disable-line

  const selEl = elementsView.find(e => e.id === selId) || null;

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const h = e => {
      // Don't intercept keys while the user is typing into an input or
      // an inline-edited text element.
      if (e.target.tagName === "INPUT" || e.target.contentEditable === "true") {
        return;
      }
      DrawConstants.DRAW_TOOLS.forEach(dt => {
        if (e.key.toUpperCase() === dt.key) {
          setTool(dt.toolId);
          setSelId(null);
        }
      });
      if (e.key === "Delete" || e.key === "Backspace") {
        // Don't delete the element while its text is being edited.
        if (selId && editId !== selId) {
          hist.push(elements.filter(x => x.id !== selId));
          setSelId(null);
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => {
      window.removeEventListener("keydown", h);
    };
  }, [selId, editId, elements]); // eslint-disable-line

  // ── Toolbar action wiring ─────────────────────────────────────────────────

  useEffect(() => {
    registerActions((id, val) => {
      DrawConstants.DRAW_TOOLS.forEach(dt => {
        if (dt.toolId === id) {
          setTool(id);
        }
      });
      if (id === "delSel" && selId) {
        hist.push(elements.filter(x => x.id !== selId));
        setSelId(null);
      }
      if (id === "export") {
        const svgEl = svgRef.current;
        if (!svgEl) {
          return;
        }
        const blob = new Blob([svgEl.outerHTML], { type: "image/svg+xml" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "nova-draw.svg";
        a.click();
      }
    });
  }); // eslint-disable-line

  // ── Coordinate conversion ─────────────────────────────────────────────────

  // Convert a mouse event's client coordinates to the SVG's virtual
  // coordinate space, accounting for current zoom and the SVG's bounding box.
  const getSVGPt = e => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: 0, y: 0 };
    }
    return {
      x: (e.clientX - rect.left) / zoom / rect.width * DrawConstants.CANVAS_WIDTH,
      y: (e.clientY - rect.top) / zoom / rect.height * DrawConstants.CANVAS_HEIGHT,
    };
  };

  // ── Canvas mouse handlers ─────────────────────────────────────────────────

  const onSVGMouseDown = e => {
    const { x, y } = getSVGPt(e);
    if (tool === "select") {
      // Clicking blank canvas clears selection / exits text editing.
      setSelId(null);
      setEditId(null);
      return;
    }
    if (tool === "pen") {
      setDrawing({ type: "pen", pts: [{ x, y }] });
      return;
    }
    setDrawing({ type: tool, x1: x, y1: y, x2: x, y2: y });
  };

  const onSVGMouseMove = e => {
    const { x, y } = getSVGPt(e);

    // Drag the selected element by translating its anchor coords by the
    // delta from drag-start. Lines and pen strokes need their other points
    // moved too, so the whole shape stays rigid.
    if (dragging) {
      const dx = x - dragging.startX;
      const dy = y - dragging.startY;
      setDragEls(elements.map(el => {
        if (el.id !== dragging.id) {
          return el;
        }
        if (el.type === "line") {
          return {
            ...el,
            x1: dragging.origX + dx,
            y1: dragging.origY + dy,
            x2: dragging.origX2 + dx,
            y2: dragging.origY2 + dy,
          };
        }
        if (el.type === "pen") {
          // Translate every point by (dx,dy) relative to the first point's
          // original position, preserving stroke shape.
          return {
            ...el,
            pts: el.pts.map(p => ({
              x: p.x - dragging.ox + dragging.origX + dx,
              y: p.y - dragging.oy + dragging.origY + dy,
            })),
          };
        }
        return { ...el, x: dragging.origX + dx, y: dragging.origY + dy };
      }));
      return;
    }

    // Update live drawing preview.
    if (!drawing) {
      return;
    }
    if (drawing.type === "pen") {
      setDrawing(d => ({ ...d, pts: [...d.pts, { x, y }] }));
      return;
    }
    setDrawing(d => ({ ...d, x2: x, y2: y }));
  };

  const onSVGMouseUp = () => {
    if (dragging) {
      if (dragEls) {
        hist.push(dragEls);
        setDragEls(null);
      }
      setDragging(null);
      return;
    }
    setDragging(null);
    if (!drawing) {
      return;
    }
    let el = null;
    const { type, x1, y1, x2, y2, pts } = drawing;

    // Build the persistent element from the in-progress drawing, but only
    // if the user actually dragged enough to make a meaningful shape.
    if (type === "rect" && Math.abs(x2 - x1) > DrawConstants.MIN_SHAPE_SIZE && Math.abs(y2 - y1) > DrawConstants.MIN_SHAPE_SIZE) {
      el = {
        id: utils._elId(),
        type: "rect",
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        w: Math.abs(x2 - x1),
        h: Math.abs(y2 - y1),
        fill,
        stroke,
        strokeW,
        rx: 0,
      };
    } else if (type === "ellipse" && Math.abs(x2 - x1) > DrawConstants.MIN_SHAPE_SIZE && Math.abs(y2 - y1) > DrawConstants.MIN_SHAPE_SIZE) {
      el = {
        id: utils._elId(),
        type: "ellipse",
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        w: Math.abs(x2 - x1),
        h: Math.abs(y2 - y1),
        fill,
        stroke,
        strokeW,
      };
    } else if (type === "line" && (Math.abs(x2 - x1) > DrawConstants.MIN_SHAPE_SIZE || Math.abs(y2 - y1) > DrawConstants.MIN_SHAPE_SIZE)) {
      el = {
        id: utils._elId(),
        type: "line",
        x1,
        y1,
        x2,
        y2,
        stroke,
        strokeW,
      };
    } else if (type === "text") {
      // Text accepts a click without drag — drop a default-sized box.
      el = {
        id: utils._elId(),
        type: "text",
        x: x1,
        y: y1,
        w: DrawConstants.DEFAULT_TEXT_WIDTH,
        h: DrawConstants.DEFAULT_TEXT_HEIGHT,
        text: "Text",
        fontSize: DrawConstants.DEFAULT_TEXT_FONT_SIZE,
        bold: false,
        color: stroke,
        align: "left",
      };
    } else if (type === "pen" && pts && pts.length > 2) {
      el = {
        id: utils._elId(),
        type: "pen",
        pts,
        stroke,
        strokeW,
        fill: "none",
      };
    }

    if (el) {
      el.layerId = activeLayerId;
      hist.push([...elements, el]);
      setSelId(el.id);
    }
    setDrawing(null);
  };

  // ── Element interaction ───────────────────────────────────────────────────

  const onElMouseDown = (el, e) => {
    e.stopPropagation();
    if (tool !== "select") {
      return;
    }
    // Don't start a drag while inline-editing text — the user is clicking
    // inside the editable surface.
    if (editId === el.id) {
      return;
    }
    setSelId(el.id);
    const { x, y } = getSVGPt(e);
    setDragging({
      id: el.id,
      startX: x,
      startY: y,
      // Anchor coords differ by element type — fall back through the options.
      origX: el.x ?? el.x1 ?? 0,
      origY: el.y ?? el.y1 ?? 0,
      origX2: el.x2 ?? 0,
      origY2: el.y2 ?? 0,
      // For pen strokes, remember the first point so we can compute deltas
      // against it during drag.
      ox: el.pts?.[0]?.x ?? 0,
      oy: el.pts?.[0]?.y ?? 0,
    });
  };

  // ── Geometry helpers ──────────────────────────────────────────────────────

  // Build an SVG path string from a pen's array of points.
  const ptsToPath = pts => {
    if (!pts || pts.length < 2) {
      return "";
    }
    return pts
      .map((p, i) => {
        if (i === 0) {
          return `M${p.x.toFixed(1)},${p.y.toFixed(1)}`;
        }
        return `L${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(" ");
  };

  // ── Render: in-progress preview ───────────────────────────────────────────

  const renderPreview = () => {
    if (!drawing) return null;
    return renderSpec(
      PREVIEW_SHAPES[drawing.type]?.(drawing, { fill, stroke, strokeW, ptsToPath })
    );
  };

  // ── Render: persisted elements ────────────────────────────────────────────

  const renderElement = el => {
    const isSel = selId === el.id && tool === "select";
    // Cursor depends on tool + drag state.
    let cursor;
    if (tool === "select") {
      cursor = dragging && dragging.id === el.id ? "grabbing" : "grab";
    } else {
      cursor = "crosshair";
    }
    const ctx = {
      isSel,
      isEdit: editId === el.id,
      cursor, tool, theme,
      onElMouseDown, setEditId, ptsToPath,
      hist, elements,
    };
    return renderSpec(DRAW_SHAPES[el.type]?.(el, ctx));
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Tool palette */}
      <div
        style={{
          width: 44,
          background: theme.surface,
          borderRight: `1px solid ${theme.border}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "8px 0",
          gap: 3,
          flexShrink: 0,
        }}
      >
        {DrawConstants.DRAW_TOOLS.map(dt => (
          <button
            key={dt.toolId}
            title={`${dt.label} (${dt.key})`}
            onClick={() => {
              setTool(dt.toolId);
              setSelId(null);
              setEditId(null);
            }}
            style={{
              width: 34,
              height: 34,
              borderRadius: theme.r6,
              border: `1px solid ${tool === dt.toolId ? appColor + "66" : theme.border}`,
              background: tool === dt.toolId ? appColor + "18" : "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: theme.transition,
            }}
          >
            <dt.Icon size={14} color={tool === dt.toolId ? appColor : theme.textDim} />
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setZoom(z => Math.min(DrawConstants.ZOOM_MAX, +(z + DrawConstants.ZOOM_STEP).toFixed(2)))}
          className="ni"
          style={{ padding: 6, border: "none", background: "transparent", cursor: "pointer", display: "flex" }}
        >
          <I.ZoomIn size={13} />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(DrawConstants.ZOOM_MIN, +(z - DrawConstants.ZOOM_STEP).toFixed(2)))}
          className="ni"
          style={{ padding: 6, border: "none", background: "transparent", cursor: "pointer", display: "flex" }}
        >
          <I.ZoomOut size={13} />
        </button>
        <div style={{ fontSize: 9, color: theme.textMuted, marginBottom: 4 }}>
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Canvas */}
      <div
        style={{
          flex: 1,
          background: theme.isDark ? "#111118" : "#DCDBD4",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseMove={onSVGMouseMove}
        onMouseUp={onSVGMouseUp}
        onMouseLeave={onSVGMouseUp}
      >
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${DrawConstants.CANVAS_WIDTH} ${DrawConstants.CANVAS_HEIGHT}`}
            width={DrawConstants.CANVAS_WIDTH}
            height={DrawConstants.CANVAS_HEIGHT}
            style={{
              background: "#FFFFFF",
              boxShadow: "0 2px 20px rgba(0,0,0,0.2)",
              display: "block",
              cursor: DrawConstants.CURSOR_BY_TOOL[tool] || "default",
            }}
            onMouseDown={onSVGMouseDown}
          >
            {/* Dot grid */}
            <defs>
              <pattern id="dotgrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="0.8" fill="rgba(0,0,0,0.1)" />
              </pattern>
            </defs>
            <rect width={DrawConstants.CANVAS_WIDTH} height={DrawConstants.CANVAS_HEIGHT} fill="url(#dotgrid)" />
            {orderedElements.map(renderElement)}
            {renderPreview()}
          </svg>
        </div>
      </div>

      {/* Properties + Layers panel */}
      <div
        style={{
          width: 188,
          background: theme.surface,
          borderLeft: `1px solid ${theme.border}`,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {/* Stroke/fill controls */}
        <div style={{ padding: 12, borderBottom: `1px solid ${theme.border}` }}>
          <div className="nsect" style={{ paddingTop: 0 }}>Paint</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: theme.r6,
                background: fill,
                border: `1px solid ${theme.border}`,
                cursor: "pointer",
                flexShrink: 0,
              }}
              title="Fill"
            />
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: theme.r6,
                background: "transparent",
                border: `3px solid ${stroke}`,
                cursor: "pointer",
                flexShrink: 0,
              }}
              title="Stroke"
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: theme.textMuted, marginBottom: 3 }}>Stroke width</div>
              <input
                type="range"
                min={1}
                max={12}
                value={strokeW}
                onChange={e => setStrokeW(+e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {[appColor, appColor + "88", "#E85252", "#3BB580", "#F59E0B", "#A87BE8", "#FFFFFF", "transparent"].map((c, i) => (
              <div
                key={i}
                onClick={() => {
                  setFill(c);
                  // Also recolor the currently-selected element so the swatch
                  // click feels like an immediate edit, not just a future default.
                  if (selId) {
                    hist.push(elements.map(e => {
                      if (e.id === selId) {
                        return { ...e, fill: c };
                      }
                      return e;
                    }));
                  }
                }}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 3,
                  background: c || "transparent",
                  border: `2px solid ${fill === c ? theme.text : theme.border}`,
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
            {[appColor, "#E85252", "#3BB580", "#F59E0B", "#A87BE8", "#000000", "#FFFFFF", "#7878A0"].map((c, i) => (
              <div
                key={i}
                onClick={() => {
                  setStroke(c);
                  if (selId) {
                    hist.push(elements.map(e => {
                      if (e.id === selId) {
                        return { ...e, stroke: c };
                      }
                      return e;
                    }));
                  }
                }}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 3,
                  background: "transparent",
                  border: `2.5px solid ${c}`,
                  cursor: "pointer",
                  outline: `1px solid ${stroke === c ? theme.text : "transparent"}`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Layers list — top layer first (matches z-stacking visually) */}
        <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
          <div
            className="nsect"
            style={{
              paddingTop: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Layers ({layers.length})</span>
            <button
              onClick={() => {
                const id = utils._elId();
                const name = `Layer ${layers.length + 1}`;
                setLayers([...layers, { id, name }]);
                setActiveLayerId(id);
              }}
              title="New layer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 18, height: 18,
                borderRadius: theme.r6,
                border: `1px solid ${theme.border}`,
                background: "transparent",
                color: theme.textDim,
                cursor: "pointer",
                fontSize: 12,
                lineHeight: 1,
              }}
            >+</button>
          </div>
          {[...layers].reverse().map(L => {
            const count = elementsView.filter(el => el.layerId === L.id).length;
            const isActive = L.id === activeLayerId;
            return (
              <div
                key={L.id}
                onClick={() => setActiveLayerId(L.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 6px",
                  borderRadius: theme.r6,
                  cursor: "pointer",
                  background: isActive ? appColor + "18" : "transparent",
                  border: `1px solid ${isActive ? appColor + "44" : "transparent"}`,
                  marginBottom: 2,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = isActive ? appColor + "18" : theme.surfaceShade;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isActive ? appColor + "18" : "transparent";
                }}
              >
                <I.Eye size={10} color={theme.textMuted} />
                <span
                  style={{
                    fontSize: 10,
                    color: isActive ? theme.text : theme.textDim,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {L.name}
                </span>
                <span style={{ fontSize: 9, color: theme.textMuted }}>{count}</span>
              </div>
            );
          })}
          {elementsView.length === 0 && (
            <div style={{ fontSize: 10, color: theme.textMuted, textAlign: "center", paddingTop: 12 }}>
              Pick a tool and draw on the canvas
            </div>
          )}
        </div>

        {/* Selected element actions */}
        {selEl && (
          <div style={{ padding: 8, borderTop: `1px solid ${theme.border}` }}>
            <button
              onClick={() => {
                hist.push(elements.filter(x => x.id !== selId));
                setSelId(null);
              }}
              className="nb ng"
              style={{ width: "100%", fontSize: 11, color: theme.error, borderColor: theme.error + "44" }}
            >
              <I.Trash size={11} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
