import React, { useState, useEffect, useRef } from "react";
import { I } from "../shared/icons";
import { useCanvasHistory } from "../shared/hooks/system";
import { SelectionHandles } from "../shared/canvas_utils";
import { slides as slidesConst, canvas_utils as canvas_utilsConst } from "../shared/_constants";
import { utils, canvas_utils as canvasU } from "../shared/_utils";

export const SlidesEditor = ({ appColor, doc, t: theme, onContentChange, registerActions }) => {
  const activeTheme = canvas_utilsConst.SLIDE_THEMES[0];

  // Parse stored content or fall back to a 3-slide default deck.
  const initSlides = () => {
    try {
      const parsed = JSON.parse(doc.content || "{}");
      if (parsed.slides && parsed.slides.length > 0) {
        return parsed.slides;
      }
    } catch {
      // Ignore malformed content; use default deck below.
    }
    return [
      canvasU._mkSlide("title", activeTheme),
      canvasU._mkSlide("content", activeTheme),
      canvasU._mkSlide("blank", activeTheme),
    ];
  };

  const hist = useCanvasHistory(initSlides());
  const slides = hist.current;

  const [activeSl, setActiveSl] = useState(0);
  const [selId, setSelId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deckTheme, setDeckTheme] = useState(activeTheme);
  const [presMode, setPresMode] = useState(false);
  const [presIdx, setPresIdx] = useState(0);
  // Drag bookkeeping: { elId, startX, startY, origX, origY }
  const [dragState, setDragState] = useState(null);

  const canvasRef = useRef(null);

  // Persist the deck whenever slides or theme change.
  useEffect(() => {
    onContentChange(JSON.stringify({ slides, theme: deckTheme.id }));
  }, [slides, deckTheme]); // eslint-disable-line

  const curSlide = slides[Math.min(activeSl, slides.length - 1)] || slides[0];
  const selEl = curSlide?.elements.find(e => e.id === selId) || null;

  // ── Slide / element mutation ──────────────────────────────────────────────

  // Apply `fn` to the element list of slide `slIdx` and push to history.
  const updateElements = (slIdx, fn) => {
    const next = slides.map((sl, i) => {
      if (i === slIdx) {
        return { ...sl, elements: fn(sl.elements) };
      }
      return sl;
    });
    hist.push(next);
  };

  const addSlide = (layout = "blank") => {
    hist.push([...slides, canvasU._mkSlide(layout, deckTheme)]);
    setActiveSl(slides.length);
    setSelId(null);
  };

  const dupSlide = () => {
    const newSlide = {
      ...curSlide,
      id: utils._elId(),
      elements: curSlide.elements.map(e => ({ ...e, id: utils._elId() })),
    };
    const arr = [...slides];
    arr.splice(activeSl + 1, 0, newSlide);
    hist.push(arr);
    setActiveSl(activeSl + 1);
  };

  const delSlide = () => {
    if (slides.length <= 1) {
      return;
    }
    hist.push(slides.filter((_, i) => i !== activeSl));
    setActiveSl(Math.max(0, activeSl - 1));
    setSelId(null);
  };

  const addEl = type => {
    let el;
    if (type === "text") {
      el = {
        id: utils._elId(),
        type: "text",
        x: 100,
        y: 100,
        w: 400,
        h: 80,
        text: "New text box",
        fontSize: slidesConst.DEFAULT_TEXT_FONT_SIZE,
        bold: false,
        color: deckTheme.tx,
        align: "left",
        placeholder: false,
      };
    } else if (type === "rect") {
      el = {
        id: utils._elId(),
        type: "rect",
        x: 150,
        y: 120,
        w: 300,
        h: 180,
        fill: appColor + "88",
        stroke: appColor,
        strokeW: slidesConst.DEFAULT_STROKE_WIDTH,
        rx: 8,
      };
    } else if (type === "ellipse") {
      el = {
        id: utils._elId(),
        type: "ellipse",
        x: 200,
        y: 120,
        w: 260,
        h: 180,
        fill: appColor + "55",
        stroke: appColor,
        strokeW: slidesConst.DEFAULT_STROKE_WIDTH,
      };
    } else {
      el = {
        id: utils._elId(),
        type: "line",
        x1: 100,
        y1: 200,
        x2: 500,
        y2: 200,
        stroke: appColor,
        strokeW: slidesConst.DEFAULT_LINE_STROKE_WIDTH,
      };
    }
    updateElements(activeSl, els => [...els, el]);
    setSelId(el.id);
  };

  const delSel = () => {
    if (!selId) {
      return;
    }
    updateElements(activeSl, els => els.filter(e => e.id !== selId));
    setSelId(null);
  };

  // Apply a theme to every slide. Text recolours to hd/tx based on `bold`
  // so headings keep their emphasis colour after a theme swap.
  const applyTheme = thm => {
    setDeckTheme(thm);
    hist.push(slides.map(sl => ({
      ...sl,
      bg: thm.bg,
      elements: sl.elements.map(e => {
        if (e.type === "text") {
          return { ...e, color: e.bold ? thm.hd : thm.tx };
        }
        return e;
      }),
    })));
  };

  // ── Toolbar wiring ────────────────────────────────────────────────────────

  useEffect(() => {
    registerActions((id, val) => {
      if (id === "addText") {
        addEl("text");
      } else if (id === "addRect") {
        addEl("rect");
      } else if (id === "addEllipse") {
        addEl("ellipse");
      } else if (id === "delSel") {
        delSel();
      } else if (id === "dupSlide") {
        dupSlide();
      } else if (id === "present") {
        setPresIdx(activeSl);
        setPresMode(true);
      } else if (id === "theme") {
        const thm = canvas_utilsConst.SLIDE_THEMES.find(x => x.id === val) || canvas_utilsConst.SLIDE_THEMES[0];
        applyTheme(thm);
      } else if (id === "layout") {
        addSlide(val);
      }
    });
  }); // eslint-disable-line

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const handler = e => {
      if (e.key === "Delete" || e.key === "Backspace") {
        // Don't intercept Backspace while editing a text element.
        if (selId && editId !== selId) {
          delSel();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [selId, editId]); // eslint-disable-line

  // ── Drag-to-move ──────────────────────────────────────────────────────────

  // Convert a DOM event into logical SVG coordinates (the canvas viewBox space).
  const getSVGCoords = e => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!rect) {
      return { x: 0, y: 0 };
    }
    const scaleX = slidesConst.CANVAS_WIDTH / rect.width;
    const scaleY = slidesConst.CANVAS_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const onCanvasMouseDown = e => {
    if (e.target === canvasRef.current) {
      setSelId(null);
      setEditId(null);
    }
  };

  const onElMouseDown = (el, e) => {
    e.stopPropagation();
    // Don't start a drag while editing the text inside this element.
    if (editId === el.id) {
      return;
    }
    setSelId(el.id);
    const { x, y } = getSVGCoords(e);
    setDragState({
      elId: el.id,
      startX: x,
      startY: y,
      origX: el.x ?? el.x1 ?? 0,
      origY: el.y ?? el.y1 ?? 0,
    });
  };

  const onCanvasMouseMove = e => {
    if (!dragState) {
      return;
    }
    const { x, y } = getSVGCoords(e);
    const dx = x - dragState.startX;
    const dy = y - dragState.startY;
    updateElements(activeSl, els => els.map(el => {
      if (el.id !== dragState.elId) {
        return el;
      }
      if (el.type === "line") {
        // Preserve line length: shift both endpoints by (dx, dy).
        return {
          ...el,
          x1: dragState.origX + dx,
          y1: dragState.origY + dy,
          x2: (el.x2 - el.x1) + dragState.origX + dx,
          y2: (el.y2 - el.y1) + dragState.origY + dy,
        };
      }
      return { ...el, x: dragState.origX + dx, y: dragState.origY + dy };
    }));
  };

  const onCanvasMouseUp = () => {
    setDragState(null);
  };

  // ── Element rendering ─────────────────────────────────────────────────────

  const renderEl = el => {
    const isSel = selId === el.id;
    const isEdit = editId === el.id;

    if (el.type === "text") {
      const textHeight = Math.max(el.h, slidesConst.TEXT_MIN_HEIGHT);
      const isDragging = dragState && dragState.elId === el.id;
      return (
        <g key={el.id}>
          <foreignObject
            x={el.x}
            y={el.y}
            width={el.w}
            height={textHeight}
            style={{
              overflow: "visible",
              cursor: isDragging ? "grabbing" : "grab",
            }}
            onMouseDown={e => onElMouseDown(el, e)}
            onDoubleClick={e => {
              e.stopPropagation();
              setEditId(el.id);
            }}
          >
            <div
              contentEditable={isEdit}
              suppressContentEditableWarning
              onBlur={e => {
                const newText = e.target.innerText;
                updateElements(activeSl, els => els.map(x => {
                  if (x.id === el.id) {
                    return { ...x, text: newText, placeholder: false };
                  }
                  return x;
                }));
                setEditId(null);
              }}
              style={{
                width: "100%",
                minHeight: slidesConst.TEXT_MIN_HEIGHT,
                fontFamily: theme.fn,
                fontSize: el.fontSize,
                fontWeight: el.bold ? 700 : 400,
                color: el.color,
                textAlign: el.align,
                lineHeight: 1.4,
                outline: isEdit ? `2px solid ${slidesConst.SELECTION_COLOR}` : "none",
                padding: isEdit ? "4px" : 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                cursor: isEdit ? "text" : "inherit",
                background: isEdit ? "rgba(255,255,255,0.05)" : "transparent",
              }}
            >
              {el.text}
            </div>
          </foreignObject>
          {isSel && !isEdit && (
            <rect
              x={el.x - 2}
              y={el.y - 2}
              width={el.w + 4}
              height={textHeight + 4}
              fill="none"
              stroke={slidesConst.SELECTION_COLOR}
              strokeWidth={1.5}
              strokeDasharray={slidesConst.SELECTION_DASH}
            />
          )}
          {isSel && !isEdit && (
            <SelectionHandles
              x={el.x}
              y={el.y}
              w={el.w}
              h={textHeight}
            />
          )}
        </g>
      );
    }

    if (el.type === "rect") {
      return (
        <g
          key={el.id}
          onMouseDown={e => onElMouseDown(el, e)}
          style={{ cursor: "grab" }}
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
              x={el.x - 3}
              y={el.y - 3}
              width={el.w + 6}
              height={el.h + 6}
              fill="none"
              stroke={slidesConst.SELECTION_COLOR}
              strokeWidth={1.5}
              strokeDasharray={slidesConst.SELECTION_DASH}
            />
          )}
          {isSel && (
            <SelectionHandles x={el.x} y={el.y} w={el.w} h={el.h} />
          )}
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
          style={{ cursor: "grab" }}
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
              x={el.x - 3}
              y={el.y - 3}
              width={el.w + 6}
              height={el.h + 6}
              fill="none"
              stroke={slidesConst.SELECTION_COLOR}
              strokeWidth={1.5}
              strokeDasharray={slidesConst.SELECTION_DASH}
            />
          )}
          {isSel && (
            <SelectionHandles x={el.x} y={el.y} w={el.w} h={el.h} />
          )}
        </g>
      );
    }

    if (el.type === "line") {
      return (
        <g
          key={el.id}
          onMouseDown={e => onElMouseDown(el, e)}
          style={{ cursor: "grab" }}
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
            <line
              x1={el.x1}
              y1={el.y1}
              x2={el.x2}
              y2={el.y2}
              stroke={slidesConst.SELECTION_COLOR}
              strokeWidth={el.strokeW + 4}
              strokeOpacity={0.3}
              strokeLinecap="round"
            />
          )}
        </g>
      );
    }

    return null;
  };

  // ── Presenter mode ────────────────────────────────────────────────────────

  if (presMode) {
    const ps = slides[presIdx] || slides[0];
    const advanceOrExit = () => {
      if (presIdx < slides.length - 1) {
        setPresIdx(i => i + 1);
      } else {
        setPresMode(false);
      }
    };
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: ps.bg || "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={advanceOrExit}
      >
        <svg
          viewBox={`0 0 ${slidesConst.CANVAS_WIDTH} ${slidesConst.CANVAS_HEIGHT}`}
          style={{ width: "90vw", maxWidth: 1200, aspectRatio: "16/9" }}
        >
          <rect width={slidesConst.CANVAS_WIDTH} height={slidesConst.CANVAS_HEIGHT} fill={ps.bg || "#fff"} />
          {ps.elements.map(renderEl)}
        </svg>
        <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", gap: 8 }}>
          <button
            className="nb ng"
            style={{ background: "rgba(0,0,0,0.5)", color: "#fff", border: "none" }}
            onClick={e => {
              e.stopPropagation();
              setPresIdx(i => Math.max(0, i - 1));
            }}
          >
            <I.ChevLeft size={14} />
          </button>
          <span
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.7)",
              alignSelf: "center",
            }}
          >
            {presIdx + 1} / {slides.length}
          </span>
          <button
            className="nb ng"
            style={{ background: "rgba(0,0,0,0.5)", color: "#fff", border: "none" }}
            onClick={e => {
              e.stopPropagation();
              advanceOrExit();
            }}
          >
            {presIdx < slides.length - 1 ? <I.ChevRight size={14} /> : <I.X size={14} />}
          </button>
          <button
            className="nb ng"
            style={{ background: "rgba(0,0,0,0.5)", color: "#fff", border: "none" }}
            onClick={e => {
              e.stopPropagation();
              setPresMode(false);
            }}
          >
            <I.X size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ── Editor render ─────────────────────────────────────────────────────────

  const canvasBackground = theme.dk ? "#1A1A24" : "#D4D4CE";

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Slide thumbnail strip */}
      <div
        style={{
          width: 148,
          background: theme.surface,
          borderRight: `1px solid ${theme.bd}`,
          padding: 8,
          overflowY: "auto",
          flexShrink: 0,
        }}
      >
        {slides.map((sl, i) => (
          <div
            key={sl.id}
            onClick={() => {
              setActiveSl(i);
              setSelId(null);
              setEditId(null);
            }}
            style={{ marginBottom: 6, cursor: "pointer", position: "relative" }}
          >
            <div
              style={{
                aspectRatio: "16/9",
                background: sl.bg || "#fff",
                border: `2px solid ${i === activeSl ? appColor : theme.bd}`,
                borderRadius: 4,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <svg
                viewBox={`0 0 ${slidesConst.CANVAS_WIDTH} ${slidesConst.CANVAS_HEIGHT}`}
                style={{ width: "100%", height: "100%", pointerEvents: "none" }}
              >
                <rect width={slidesConst.CANVAS_WIDTH} height={slidesConst.CANVAS_HEIGHT} fill={sl.bg || "#fff"} />
                {sl.elements.map(el => {
                  if (el.type === "rect") {
                    return (
                      <rect
                        key={el.id}
                        x={el.x}
                        y={el.y}
                        width={el.w}
                        height={el.h}
                        fill={el.fill || "transparent"}
                        stroke={el.stroke || "#888"}
                        strokeWidth={el.strokeW || 2}
                        rx={el.rx || 0}
                      />
                    );
                  }
                  if (el.type === "ellipse") {
                    const cx = el.x + el.w / 2;
                    const cy = el.y + el.h / 2;
                    return (
                      <ellipse
                        key={el.id}
                        cx={cx}
                        cy={cy}
                        rx={el.w / 2}
                        ry={el.h / 2}
                        fill={el.fill || "transparent"}
                        stroke={el.stroke || "#888"}
                        strokeWidth={el.strokeW || 2}
                      />
                    );
                  }
                  if (el.type === "text") {
                    return (
                      <text
                        key={el.id}
                        x={el.align === "center" ? el.x + el.w / 2 : el.x}
                        y={el.y + el.fontSize * 0.8}
                        fontSize={el.fontSize * 0.5}
                        fontWeight={el.bold ? 700 : 400}
                        fill={el.color}
                        textAnchor={el.align === "center" ? "middle" : "start"}
                      >
                        {el.text?.slice(0, 30)}
                      </text>
                    );
                  }
                  return null;
                })}
              </svg>
            </div>
            <div
              style={{
                fontSize: 9,
                color: theme.tm,
                textAlign: "center",
                marginTop: 2,
              }}
            >
              Slide {i + 1}
            </div>
          </div>
        ))}

        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
          <button
            onClick={() => addSlide("blank")}
            style={{
              flex: 1,
              padding: "5px 0",
              fontSize: 9,
              color: theme.ts,
              border: `1px dashed ${theme.bd}`,
              borderRadius: theme.r6,
              cursor: "pointer",
              background: "transparent",
              fontFamily: theme.fn,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
            }}
          >
            <I.Plus size={9} /> Add
          </button>
          {slides.length > 1 && (
            <button
              onClick={delSlide}
              style={{
                padding: "5px 7px",
                fontSize: 9,
                color: theme.er,
                border: `1px solid ${theme.er}22`,
                borderRadius: theme.r6,
                cursor: "pointer",
                background: "transparent",
                fontFamily: theme.fn,
                display: "flex",
                alignItems: "center",
              }}
            >
              <I.Trash size={9} />
            </button>
          )}
        </div>

        {/* Theme strip */}
        <div
          style={{
            marginTop: 12,
            paddingTop: 8,
            borderTop: `1px solid ${theme.bd}`,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: theme.tm,
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Themes
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {canvas_utilsConst.SLIDE_THEMES.map(thm => (
              <div
                key={thm.id}
                onClick={() => applyTheme(thm)}
                title={thm.label}
                style={{
                  width: 22,
                  height: 14,
                  borderRadius: 3,
                  background: thm.bg,
                  border: `2px solid ${deckTheme.id === thm.id ? appColor : "transparent"}`,
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main canvas */}
      <div
        style={{
          flex: 1,
          background: canvasBackground,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
        }}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onCanvasMouseUp}
        onMouseLeave={onCanvasMouseUp}
      >
        <svg
          ref={canvasRef}
          viewBox={`0 0 ${slidesConst.CANVAS_WIDTH} ${slidesConst.CANVAS_HEIGHT}`}
          style={{
            width: "min(760px,92%)",
            aspectRatio: "16/9",
            boxShadow: "0 4px 32px rgba(0,0,0,0.25)",
            cursor: "default",
            display: "block",
          }}
          onMouseDown={onCanvasMouseDown}
        >
          <rect width={slidesConst.CANVAS_WIDTH} height={slidesConst.CANVAS_HEIGHT} fill={curSlide?.bg || "#fff"} />
          {curSlide?.elements.map(renderEl)}
        </svg>

        {/* Floating add buttons */}
        <div
          style={{
            position: "absolute",
            bottom: 14,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 6,
          }}
        >
          {[
            ["text", "T", I.TypeT],
            ["rect", "Rect", I.Square],
            ["ellipse", "Circle", I.Globe],
          ].map(([type, label, Ico]) => (
            <button
              key={type}
              onClick={() => addEl(type)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                borderRadius: theme.rF,
                background: theme.el,
                border: `1px solid ${theme.bd}`,
                color: theme.ts,
                fontSize: 11,
                cursor: "pointer",
                fontFamily: theme.fn,
                gap: 4,
              }}
            >
              <Ico size={12} />
              {label}
            </button>
          ))}
          <button
            onClick={() => {
              setPresIdx(activeSl);
              setPresMode(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: theme.rF,
              background: appColor,
              border: "none",
              color: "white",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: theme.fn,
              fontWeight: 700,
            }}
          >
            <I.Play size={11} /> Present
          </button>
        </div>
      </div>

      {/* Properties panel */}
      <div
        style={{
          width: 188,
          background: theme.surface,
          borderLeft: `1px solid ${theme.bd}`,
          padding: 12,
          flexShrink: 0,
          overflowY: "auto",
        }}
      >
        <div className="nsect" style={{ paddingTop: 0 }}>
          Slide {activeSl + 1} of {slides.length}
        </div>
        {!selEl && (
          <div style={{ fontSize: 11, color: theme.tm, lineHeight: 1.5 }}>
            Click an element to select it. Double-click text to edit.
          </div>
        )}
        {selEl && (
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: theme.tm,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {selEl.type} properties
            </div>

            {selEl.type === "text" && (
              <>
                <div style={{ marginBottom: 8 }}>
                  <label
                    style={{
                      fontSize: 10,
                      color: theme.tm,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Font size
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={72}
                    value={selEl.fontSize}
                    onChange={e => {
                      const newSize = +e.target.value;
                      updateElements(activeSl, els => els.map(x => {
                        if (x.id === selEl.id) {
                          return { ...x, fontSize: newSize };
                        }
                        return x;
                      }));
                    }}
                    style={{ width: "100%" }}
                  />
                  <span style={{ fontSize: 10, color: theme.ts }}>{selEl.fontSize}px</span>
                </div>

                <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                  {["left", "center", "right"].map(a => (
                    <button
                      key={a}
                      onClick={() => updateElements(activeSl, els => els.map(x => {
                        if (x.id === selEl.id) {
                          return { ...x, align: a };
                        }
                        return x;
                      }))}
                      style={{
                        flex: 1,
                        padding: "4px",
                        fontSize: 9,
                        borderRadius: theme.r6,
                        border: `1px solid ${selEl.align === a ? appColor : theme.bd}`,
                        background: selEl.align === a ? appColor + "18" : "transparent",
                        cursor: "pointer",
                        color: selEl.align === a ? appColor : theme.ts,
                        textTransform: "capitalize",
                      }}
                    >
                      {a}
                    </button>
                  ))}
                </div>

                <div style={{ marginBottom: 8 }}>
                  <label
                    style={{
                      fontSize: 10,
                      color: theme.tm,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Text colour
                  </label>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {[
                      deckTheme.hd,
                      deckTheme.tx,
                      deckTheme.ac,
                      "#E85252",
                      "#3BB580",
                      "#F59E0B",
                      "#FFFFFF",
                      "#000000",
                    ].map(c => (
                      <div
                        key={c}
                        onClick={() => updateElements(activeSl, els => els.map(x => {
                          if (x.id === selEl.id) {
                            return { ...x, color: c };
                          }
                          return x;
                        }))}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: c,
                          cursor: "pointer",
                          border: `2px solid ${selEl.color === c ? theme.tx : "transparent"}`,
                          outline: `1px solid ${theme.bd}`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {(selEl.type === "rect" || selEl.type === "ellipse") && (
              <>
                <div style={{ marginBottom: 8 }}>
                  <label
                    style={{
                      fontSize: 10,
                      color: theme.tm,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Fill
                  </label>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {[
                      appColor + "88",
                      appColor + "44",
                      "transparent",
                      "#E85252aa",
                      "#3BB580aa",
                      "#F59E0Baa",
                      "#ffffffcc",
                      "#00000044",
                    ].map(c => (
                      <div
                        key={c}
                        onClick={() => updateElements(activeSl, els => els.map(x => {
                          if (x.id === selEl.id) {
                            return { ...x, fill: c };
                          }
                          return x;
                        }))}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          background: c || "transparent",
                          cursor: "pointer",
                          border: `2px solid ${selEl.fill === c ? theme.tx : theme.bd}`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            <div
              style={{
                marginTop: 12,
                paddingTop: 8,
                borderTop: `1px solid ${theme.bd}`,
              }}
            >
              <button
                onClick={delSel}
                className="nb ng"
                style={{
                  width: "100%",
                  fontSize: 11,
                  color: theme.er,
                  borderColor: theme.er + "44",
                }}
              >
                <I.Trash size={11} /> Delete element
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
