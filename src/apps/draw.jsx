import React, { useState, useEffect, useRef } from "react";
import { I } from "../shared/icons";
import { useCanvasHistory } from "../shared/hooks/system";
import { SelectionHandles } from "../shared/canvas_utils";
import { draw as C } from "../shared/_constants";
import { utils } from "../shared/_utils";

export const DrawEditor = ({ appColor, doc, t: theme, onContentChange, registerActions }) => {
  // ── Initial element load ──────────────────────────────────────────────────
  // Parse the persisted JSON doc once on mount; tolerate corrupt/empty content.
  const initEls = () => {
    try {
      const parsed = JSON.parse(doc.content || "{}");
      if (parsed.elements) {
        return parsed.elements;
      }
    } catch {
      // Ignore parse errors — start with an empty canvas.
    }
    return [];
  };

  const hist = useCanvasHistory(initEls());
  const elements = hist.current;

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

  const svgRef = useRef(null);

  const [fill, setFill] = useState(appColor + "55");
  const [stroke, setStroke] = useState(appColor);
  const [strokeW, setStrokeW] = useState(2);

  // Push the serialized canvas up whenever elements change.
  useEffect(() => {
    onContentChange(JSON.stringify({ elements }));
  }, [elements]); // eslint-disable-line

  const selEl = elementsView.find(e => e.id === selId) || null;

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const h = e => {
      // Don't intercept keys while the user is typing into an input or
      // an inline-edited text element.
      if (e.target.tagName === "INPUT" || e.target.contentEditable === "true") {
        return;
      }
      C.DRAW_TOOLS.forEach(dt => {
        if (e.key.toUpperCase() === dt.key) {
          setTool(dt.id);
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
      C.DRAW_TOOLS.forEach(dt => {
        if (dt.id === id) {
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
      x: (e.clientX - rect.left) / zoom / rect.width * C.CANVAS_WIDTH,
      y: (e.clientY - rect.top) / zoom / rect.height * C.CANVAS_HEIGHT,
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
    if (type === "rect" && Math.abs(x2 - x1) > C.MIN_SHAPE_SIZE && Math.abs(y2 - y1) > C.MIN_SHAPE_SIZE) {
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
    } else if (type === "ellipse" && Math.abs(x2 - x1) > C.MIN_SHAPE_SIZE && Math.abs(y2 - y1) > C.MIN_SHAPE_SIZE) {
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
    } else if (type === "line" && (Math.abs(x2 - x1) > C.MIN_SHAPE_SIZE || Math.abs(y2 - y1) > C.MIN_SHAPE_SIZE)) {
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
        w: C.DEFAULT_TEXT_WIDTH,
        h: C.DEFAULT_TEXT_HEIGHT,
        text: "Text",
        fontSize: C.DEFAULT_TEXT_FONT_SIZE,
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
    if (!drawing) {
      return null;
    }
    const { type, x1, y1, x2, y2, pts } = drawing;
    if (type === "rect") {
      return (
        <rect
          x={Math.min(x1, x2)}
          y={Math.min(y1, y2)}
          width={Math.abs(x2 - x1)}
          height={Math.abs(y2 - y1)}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeW}
          strokeDasharray="4 2"
        />
      );
    }
    if (type === "ellipse") {
      const rx = Math.abs(x2 - x1) / 2;
      const ry = Math.abs(y2 - y1) / 2;
      return (
        <ellipse
          cx={(x1 + x2) / 2}
          cy={(y1 + y2) / 2}
          rx={rx}
          ry={ry}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeW}
          strokeDasharray="4 2"
        />
      );
    }
    if (type === "line") {
      return (
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={stroke}
          strokeWidth={strokeW}
          strokeDasharray="4 2"
        />
      );
    }
    if (type === "pen" && pts) {
      return (
        <path
          d={ptsToPath(pts)}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }
    return null;
  };

  // ── Render: persisted elements ────────────────────────────────────────────

  const renderElement = el => {
    const isSel = selId === el.id && tool === "select";
    const isEdit = editId === el.id;

    // Cursor over an element depends on tool + drag state.
    let cur;
    if (tool === "select") {
      if (dragging && dragging.id === el.id) {
        cur = "grabbing";
      } else {
        cur = "grab";
      }
    } else {
      cur = "crosshair";
    }

    if (el.type === "rect") {
      return (
        <g
          key={el.id}
          onMouseDown={e => onElMouseDown(el, e)}
          style={{ cursor: cur }}
        >
          <rect
            x={el.x}
            y={el.y}
            width={el.w}
            height={el.h}
            fill={el.fill || "transparent"}
            stroke={el.stroke || "#888"}
            strokeWidth={el.strokeW || 2}
            rx={el.rx || 0}
          />
          {isSel && (
            <rect
              x={el.x - C.SELECTION_PAD}
              y={el.y - C.SELECTION_PAD}
              width={el.w + C.SELECTION_PAD * 2}
              height={el.h + C.SELECTION_PAD * 2}
              fill="none"
              stroke="#4A8FE8"
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
          )}
          {isSel && <SelectionHandles x={el.x} y={el.y} w={el.w} h={el.h} />}
        </g>
      );
    }

    if (el.type === "ellipse") {
      const cx = el.x + el.w / 2;
      const cy = el.y + el.h / 2;
      return (
        <g
          key={el.id}
          onMouseDown={e => onElMouseDown(el, e)}
          style={{ cursor: cur }}
        >
          <ellipse
            cx={cx}
            cy={cy}
            rx={el.w / 2}
            ry={el.h / 2}
            fill={el.fill || "transparent"}
            stroke={el.stroke || "#888"}
            strokeWidth={el.strokeW || 2}
          />
          {isSel && (
            <rect
              x={el.x - C.SELECTION_PAD}
              y={el.y - C.SELECTION_PAD}
              width={el.w + C.SELECTION_PAD * 2}
              height={el.h + C.SELECTION_PAD * 2}
              fill="none"
              stroke="#4A8FE8"
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
          )}
          {isSel && <SelectionHandles x={el.x} y={el.y} w={el.w} h={el.h} />}
        </g>
      );
    }

    if (el.type === "line") {
      return (
        <g
          key={el.id}
          onMouseDown={e => onElMouseDown(el, e)}
          style={{ cursor: cur }}
        >
          <line
            x1={el.x1}
            y1={el.y1}
            x2={el.x2}
            y2={el.y2}
            stroke={el.stroke || "#888"}
            strokeWidth={el.strokeW || 2}
            strokeLinecap="round"
          />
          {isSel && (
            // Translucent thicker overlay acts as the "selected" indicator
            // for lines, since a bounding box around a thin line looks odd.
            <line
              x1={el.x1}
              y1={el.y1}
              x2={el.x2}
              y2={el.y2}
              stroke="#4A8FE8"
              strokeWidth={(el.strokeW || 2) + 6}
              strokeOpacity={0.25}
              strokeLinecap="round"
            />
          )}
        </g>
      );
    }

    if (el.type === "pen") {
      return (
        <path
          key={el.id}
          d={ptsToPath(el.pts)}
          fill={el.fill || "none"}
          stroke={el.stroke || "#888"}
          strokeWidth={el.strokeW || 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          onMouseDown={e => onElMouseDown(el, e)}
          style={{ cursor: cur }}
        />
      );
    }

    if (el.type === "text") {
      // Text uses a foreignObject so we can leverage native contentEditable
      // for inline editing — pure SVG text doesn't support that.
      const boxHeight = Math.max(el.h, 40);
      return (
        <g key={el.id} onMouseDown={e => onElMouseDown(el, e)}>
          <foreignObject
            x={el.x}
            y={el.y}
            width={el.w}
            height={boxHeight}
            style={{ overflow: "visible", cursor: cur }}
          >
            <div
              contentEditable={isEdit}
              suppressContentEditableWarning
              onDoubleClick={e => {
                e.stopPropagation();
                if (tool === "select") {
                  setEditId(el.id);
                }
              }}
              onBlur={e => {
                hist.push(elements.map(x => {
                  if (x.id === el.id) {
                    return { ...x, text: e.target.innerText };
                  }
                  return x;
                }));
                setEditId(null);
              }}
              style={{
                fontFamily: theme.fn,
                fontSize: el.fontSize,
                fontWeight: el.bold ? 700 : 400,
                color: el.color,
                textAlign: el.align,
                lineHeight: 1.4,
                outline: isEdit ? "2px solid #4A8FE8" : "none",
                padding: isEdit ? "4px" : 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: isEdit ? "rgba(255,255,255,0.05)" : "transparent",
                minHeight: 30,
              }}
            >
              {el.text}
            </div>
          </foreignObject>
          {isSel && (
            <rect
              x={el.x - C.TEXT_SELECTION_PAD}
              y={el.y - C.TEXT_SELECTION_PAD}
              width={el.w + C.TEXT_SELECTION_PAD * 2}
              height={boxHeight + C.TEXT_SELECTION_PAD * 2}
              fill="none"
              stroke="#4A8FE8"
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
          )}
          {isSel && !isEdit && (
            <SelectionHandles x={el.x} y={el.y} w={el.w} h={boxHeight} />
          )}
        </g>
      );
    }

    return null;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Tool palette */}
      <div
        style={{
          width: 44,
          background: theme.surface,
          borderRight: `1px solid ${theme.bd}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "8px 0",
          gap: 3,
          flexShrink: 0,
        }}
      >
        {C.DRAW_TOOLS.map(dt => (
          <button
            key={dt.id}
            title={`${dt.label} (${dt.key})`}
            onClick={() => {
              setTool(dt.id);
              setSelId(null);
              setEditId(null);
            }}
            style={{
              width: 34,
              height: 34,
              borderRadius: theme.r6,
              border: `1px solid ${tool === dt.id ? appColor + "66" : theme.bd}`,
              background: tool === dt.id ? appColor + "18" : "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: theme.tr,
            }}
          >
            <dt.Icon size={14} color={tool === dt.id ? appColor : theme.ts} />
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setZoom(z => Math.min(C.ZOOM_MAX, +(z + C.ZOOM_STEP).toFixed(2)))}
          className="ni"
          style={{ padding: 6, border: "none", background: "transparent", cursor: "pointer", display: "flex" }}
        >
          <I.ZoomIn size={13} />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(C.ZOOM_MIN, +(z - C.ZOOM_STEP).toFixed(2)))}
          className="ni"
          style={{ padding: 6, border: "none", background: "transparent", cursor: "pointer", display: "flex" }}
        >
          <I.ZoomOut size={13} />
        </button>
        <div style={{ fontSize: 9, color: theme.tm, marginBottom: 4 }}>
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Canvas */}
      <div
        style={{
          flex: 1,
          background: theme.dk ? "#111118" : "#DCDBD4",
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
            viewBox={`0 0 ${C.CANVAS_WIDTH} ${C.CANVAS_HEIGHT}`}
            width={C.CANVAS_WIDTH}
            height={C.CANVAS_HEIGHT}
            style={{
              background: "#FFFFFF",
              boxShadow: "0 2px 20px rgba(0,0,0,0.2)",
              display: "block",
              cursor: C.CURSOR_BY_TOOL[tool] || "default",
            }}
            onMouseDown={onSVGMouseDown}
          >
            {/* Dot grid */}
            <defs>
              <pattern id="dotgrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="0.8" fill="rgba(0,0,0,0.1)" />
              </pattern>
            </defs>
            <rect width={C.CANVAS_WIDTH} height={C.CANVAS_HEIGHT} fill="url(#dotgrid)" />
            {elementsView.map(renderElement)}
            {renderPreview()}
          </svg>
        </div>
      </div>

      {/* Properties + Layers panel */}
      <div
        style={{
          width: 188,
          background: theme.surface,
          borderLeft: `1px solid ${theme.bd}`,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {/* Stroke/fill controls */}
        <div style={{ padding: 12, borderBottom: `1px solid ${theme.bd}` }}>
          <div className="nsect" style={{ paddingTop: 0 }}>Paint</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: theme.r6,
                background: fill,
                border: `1px solid ${theme.bd}`,
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
              <div style={{ fontSize: 9, color: theme.tm, marginBottom: 3 }}>Stroke width</div>
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
                  border: `2px solid ${fill === c ? theme.tx : theme.bd}`,
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
                  outline: `1px solid ${stroke === c ? theme.tx : "transparent"}`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Layers list */}
        <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
          <div className="nsect" style={{ paddingTop: 0 }}>Layers ({elementsView.length})</div>
          {[...elementsView].reverse().map((el, i) => (
            <div
              key={el.id}
              onClick={() => {
                setTool("select");
                setSelId(el.id);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 6px",
                borderRadius: theme.r6,
                cursor: "pointer",
                background: selId === el.id ? appColor + "18" : "transparent",
                border: `1px solid ${selId === el.id ? appColor + "44" : "transparent"}`,
                marginBottom: 2,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = selId === el.id ? appColor + "18" : theme.sh;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = selId === el.id ? appColor + "18" : "transparent";
              }}
            >
              <I.Eye size={10} color={theme.tm} />
              <span
                style={{
                  fontSize: 10,
                  color: selId === el.id ? theme.tx : theme.ts,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {el.type === "text"
                  ? `"${el.text?.slice(0, 12) || "Text"}"`
                  : `${el.type} ${elements.length - i}`}
              </span>
            </div>
          ))}
          {elementsView.length === 0 && (
            <div style={{ fontSize: 10, color: theme.tm, textAlign: "center", paddingTop: 12 }}>
              Pick a tool and draw on the canvas
            </div>
          )}
        </div>

        {/* Selected element actions */}
        {selEl && (
          <div style={{ padding: 8, borderTop: `1px solid ${theme.bd}` }}>
            <button
              onClick={() => {
                hist.push(elements.filter(x => x.id !== selId));
                setSelId(null);
              }}
              className="nb ng"
              style={{ width: "100%", fontSize: 11, color: theme.er, borderColor: theme.er + "44" }}
            >
              <I.Trash size={11} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
