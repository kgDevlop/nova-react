import React, { useState, useEffect, useRef } from "react";
import { I } from "../shared/icons";
import { useCanvasHistory } from "../shared/hooks/system";
import { SelectionHandles, renderSpec } from "../shared/canvas_utils";
import { SlidesConstants } from "../shared/_constants";
import { utils, canvas_utils as canvasU } from "../shared/_utils";

// Sharded map: element.type → spec-builder. Each builder returns a tree the
// recursive renderSpec walks into JSX. `editorContext` bundles closure state
// from SlidesEditor.
const SLIDE_SHAPES = {
  text: (element, editorContext) => {
    const textHeight = Math.max(element.h, SlidesConstants.TEXT_MIN_HEIGHT);
    const isDragging = editorContext.dragState && editorContext.dragState.elId === element.id;
    return {
      tag: "g", key: element.id,
      children: [
        { tag: "foreignObject",
          x: element.x, y: element.y, width: element.w, height: textHeight,
          style: { overflow: "visible", cursor: isDragging ? "grabbing" : "grab" },
          onMouseDown: mouseDownEvent => editorContext.onElMouseDown(element, mouseDownEvent),
          onDoubleClick: doubleClickEvent => {
            doubleClickEvent.stopPropagation();
            editorContext.setEditId(element.id);
          },
          children: {
            tag: "div",
            contentEditable: editorContext.isEdit,
            suppressContentEditableWarning: true,
            onBlur: blurEvent => {
              const newText = blurEvent.target.innerText;
              editorContext.updateElements(editorContext.activeSl, currentElements =>
                currentElements.map(currentElement => {
                  if (currentElement.id === element.id) {
                    return { ...currentElement, text: newText, placeholder: false };
                  }
                  return currentElement;
                }),
              );
              editorContext.setEditId(null);
            },
            style: {
              width: "100%",
              minHeight: SlidesConstants.TEXT_MIN_HEIGHT,
              fontFamily: editorContext.theme.fontFamily,
              fontSize: element.fontSize,
              fontWeight: element.bold ? 700 : 400,
              color: element.color,
              textAlign: element.align,
              lineHeight: 1.4,
              outline: editorContext.isEdit ? `2px solid ${SlidesConstants.SELECTION_COLOR}` : "none",
              padding: editorContext.isEdit ? "4px" : 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              cursor: editorContext.isEdit ? "text" : "inherit",
              background: editorContext.isEdit ? "rgba(255,255,255,0.05)" : "transparent",
            },
            children: element.text,
          },
        },
        editorContext.isSel && !editorContext.isEdit && { tag: "rect", key: "sel",
          x: element.x - 2, y: element.y - 2, width: element.w + 4, height: textHeight + 4,
          fill: "none",
          stroke: SlidesConstants.SELECTION_COLOR,
          strokeWidth: 1.5,
          strokeDasharray: SlidesConstants.SELECTION_DASH },
        editorContext.isSel && !editorContext.isEdit && { tag: SelectionHandles, key: "h",
          x: element.x, y: element.y, w: element.w, h: textHeight },
      ],
    };
  },

  rect: (element, editorContext) => ({
    tag: "g", key: element.id,
    onMouseDown: mouseDownEvent => editorContext.onElMouseDown(element, mouseDownEvent),
    style: { cursor: "grab" },
    children: [
      { tag: "rect",
        x: element.x, y: element.y, width: element.w, height: element.h,
        fill: element.fill || "transparent",
        stroke: element.stroke || "#888",
        strokeWidth: element.strokeW || 2,
        rx: element.rx || 0 },
      editorContext.isSel && { tag: "rect", key: "sel",
        x: element.x - 3, y: element.y - 3, width: element.w + 6, height: element.h + 6,
        fill: "none",
        stroke: SlidesConstants.SELECTION_COLOR,
        strokeWidth: 1.5,
        strokeDasharray: SlidesConstants.SELECTION_DASH },
      editorContext.isSel && { tag: SelectionHandles, key: "h",
        x: element.x, y: element.y, w: element.w, h: element.h },
    ],
  }),

  ellipse: (element, editorContext) => ({
    tag: "g", key: element.id,
    onMouseDown: mouseDownEvent => editorContext.onElMouseDown(element, mouseDownEvent),
    style: { cursor: "grab" },
    children: [
      { tag: "ellipse",
        cx: element.x + element.w / 2, cy: element.y + element.h / 2,
        rx: element.w / 2, ry: element.h / 2,
        fill: element.fill || "transparent",
        stroke: element.stroke || "#888",
        strokeWidth: element.strokeW || 2 },
      editorContext.isSel && { tag: "rect", key: "sel",
        x: element.x - 3, y: element.y - 3, width: element.w + 6, height: element.h + 6,
        fill: "none",
        stroke: SlidesConstants.SELECTION_COLOR,
        strokeWidth: 1.5,
        strokeDasharray: SlidesConstants.SELECTION_DASH },
      editorContext.isSel && { tag: SelectionHandles, key: "h",
        x: element.x, y: element.y, w: element.w, h: element.h },
    ],
  }),

  line: (element, editorContext) => ({
    tag: "g", key: element.id,
    onMouseDown: mouseDownEvent => editorContext.onElMouseDown(element, mouseDownEvent),
    style: { cursor: "grab" },
    children: [
      { tag: "line",
        x1: element.x1, y1: element.y1, x2: element.x2, y2: element.y2,
        stroke: element.stroke || "#888",
        strokeWidth: element.strokeW || 2,
        strokeLinecap: "round" },
      editorContext.isSel && { tag: "line", key: "sel",
        x1: element.x1, y1: element.y1, x2: element.x2, y2: element.y2,
        stroke: SlidesConstants.SELECTION_COLOR,
        strokeWidth: element.strokeW + 4,
        strokeOpacity: 0.3,
        strokeLinecap: "round" },
    ],
  }),
};

// Slide-thumbnail map: same shapes, no selection chrome, smaller font.
const THUMB_SHAPES = {
  rect: (element) => ({
    tag: "rect", key: element.id,
    x: element.x, y: element.y, width: element.w, height: element.h,
    fill: element.fill || "transparent",
    stroke: element.stroke || "#888",
    strokeWidth: element.strokeW || 2,
    rx: element.rx || 0,
  }),
  ellipse: (element) => ({
    tag: "ellipse", key: element.id,
    cx: element.x + element.w / 2, cy: element.y + element.h / 2,
    rx: element.w / 2, ry: element.h / 2,
    fill: element.fill || "transparent",
    stroke: element.stroke || "#888",
    strokeWidth: element.strokeW || 2,
  }),
  text: (element) => ({
    tag: "text", key: element.id,
    x: element.align === "center" ? element.x + element.w / 2 : element.x,
    y: element.y + element.fontSize * 0.8,
    fontSize: element.fontSize * 0.5,
    fontWeight: element.bold ? 700 : 400,
    fill: element.color,
    textAnchor: element.align === "center" ? "middle" : "start",
    children: element.text?.slice(0, 30),
  }),
};

export const SlidesEditor = ({ appColor, doc, t: theme, onContentChange, registerActions }) => {
  const activeTheme = SlidesConstants.SLIDE_THEMES[0];

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
    onContentChange(JSON.stringify({ slides, theme: deckTheme.themeId }));
  }, [slides, deckTheme]); // eslint-disable-line

  const curSlide = slides[Math.min(activeSl, slides.length - 1)] || slides[0];
  const selEl = curSlide?.elements.find(e => e.id === selId) || null;

  // ── Slide / element mutation ──────────────────────────────────────────────

  // Apply `transform` to the element list of slide `slideIndex` and push to history.
  const updateElements = (slideIndex, transform) => {
    const nextSlides = slides.map((slide, currentSlideIndex) => {
      if (currentSlideIndex === slideIndex) {
        return { ...slide, elements: transform(slide.elements) };
      }
      return slide;
    });
    hist.push(nextSlides);
  };

  const addSlide = (layout = "blank") => {
    hist.push([...slides, canvasU._mkSlide(layout, deckTheme)]);
    setActiveSl(slides.length);
    setSelId(null);
  };

  const duplicateSlide = () => {
    const newSlide = {
      id: utils._elId(),
      ...curSlide,
      elements: curSlide.elements.map(element => ({ ...element, id: utils._elId() })),
    };
    const slidesAfterInsert = [...slides];
    slidesAfterInsert.splice(activeSl + 1, 0, newSlide);
    hist.push(slidesAfterInsert);
    setActiveSl(activeSl + 1);
  };

  const deleteSlide = () => {
    if (slides.length <= 1) {
      return;
    }
    hist.push(slides.filter((_, slideIndex) => slideIndex !== activeSl));
    setActiveSl(Math.max(0, activeSl - 1));
    setSelId(null);
  };

  const addElement = elementType => {
    let newElement;
    if (elementType === "text") {
      newElement = {
        id: utils._elId(),
        type: "text",
        x: 100,
        y: 100,
        w: 400,
        h: 80,
        text: "New text box",
        fontSize: SlidesConstants.DEFAULT_TEXT_FONT_SIZE,
        bold: false,
        color: deckTheme.text,
        align: "left",
        placeholder: false,
      };
    } else if (elementType === "rect") {
      newElement = {
        id: utils._elId(),
        type: "rect",
        x: 150,
        y: 120,
        w: 300,
        h: 180,
        fill: appColor + "88",
        stroke: appColor,
        strokeW: SlidesConstants.DEFAULT_STROKE_WIDTH,
        rx: 8,
      };
    } else if (elementType === "ellipse") {
      newElement = {
        id: utils._elId(),
        type: "ellipse",
        x: 200,
        y: 120,
        w: 260,
        h: 180,
        fill: appColor + "55",
        stroke: appColor,
        strokeW: SlidesConstants.DEFAULT_STROKE_WIDTH,
      };
    } else {
      newElement = {
        id: utils._elId(),
        type: "line",
        x1: 100,
        y1: 200,
        x2: 500,
        y2: 200,
        stroke: appColor,
        strokeW: SlidesConstants.DEFAULT_LINE_STROKE_WIDTH,
      };
    }
    updateElements(activeSl, elements => [...elements, newElement]);
    setSelId(newElement.id);
  };

  const deleteSelection = () => {
    if (!selId) {
      return;
    }
    updateElements(activeSl, elements => elements.filter(element => element.id !== selId));
    setSelId(null);
  };

  // Apply a theme to every slide. Text recolours to heading/text based on
  // `bold` so headings keep their emphasis colour after a theme swap.
  const applyTheme = newSlideTheme => {
    setDeckTheme(newSlideTheme);
    hist.push(slides.map(slide => ({
      ...slide,
      bg: newSlideTheme.bg,
      elements: slide.elements.map(element => {
        if (element.type === "text") {
          return { ...element, color: element.bold ? newSlideTheme.heading : newSlideTheme.text };
        }
        return element;
      }),
    })));
  };

  // ── Toolbar wiring ────────────────────────────────────────────────────────

  useEffect(() => {
    registerActions((actionId, actionValue) => {
      if (actionId === "addText") {
        addElement("text");
      } else if (actionId === "addRectangle") {
        addElement("rect");
      } else if (actionId === "addEllipse") {
        addElement("ellipse");
      } else if (actionId === "deleteSelection") {
        deleteSelection();
      } else if (actionId === "duplicateSlide") {
        duplicateSlide();
      } else if (actionId === "startPresentation") {
        setPresIdx(activeSl);
        setPresMode(true);
      } else if (actionId === "slideTheme") {
        const matchingTheme = SlidesConstants.SLIDE_THEMES.find(slideTheme => slideTheme.themeId === actionValue) || SlidesConstants.SLIDE_THEMES[0];
        applyTheme(matchingTheme);
      } else if (actionId === "slideLayout") {
        addSlide(actionValue);
      }
    });
  }); // eslint-disable-line

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const onKeyDown = keyDownEvent => {
      if (keyDownEvent.key === "Delete" || keyDownEvent.key === "Backspace") {
        // Don't intercept Backspace while editing a text element.
        if (selId && editId !== selId) {
          deleteSelection();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
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
    const scaleX = SlidesConstants.CANVAS_WIDTH / rect.width;
    const scaleY = SlidesConstants.CANVAS_HEIGHT / rect.height;
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

  const onElMouseDown = (element, mouseDownEvent) => {
    mouseDownEvent.stopPropagation();
    // Don't start a drag while editing the text inside this element.
    if (editId === element.id) {
      return;
    }
    setSelId(element.id);
    const { x, y } = getSVGCoords(mouseDownEvent);
    setDragState({
      elId: element.id,
      startX: x,
      startY: y,
      origX: element.x ?? element.x1 ?? 0,
      origY: element.y ?? element.y1 ?? 0,
    });
  };

  const onCanvasMouseMove = mouseMoveEvent => {
    if (!dragState) {
      return;
    }
    const { x, y } = getSVGCoords(mouseMoveEvent);
    const deltaX = x - dragState.startX;
    const deltaY = y - dragState.startY;
    updateElements(activeSl, elements => elements.map(element => {
      if (element.id !== dragState.elId) {
        return element;
      }
      if (element.type === "line") {
        // Preserve line length: shift both endpoints by (deltaX, deltaY).
        return {
          ...element,
          x1: dragState.origX + deltaX,
          y1: dragState.origY + deltaY,
          x2: (element.x2 - element.x1) + dragState.origX + deltaX,
          y2: (element.y2 - element.y1) + dragState.origY + deltaY,
        };
      }
      return { ...element, x: dragState.origX + deltaX, y: dragState.origY + deltaY };
    }));
  };

  const onCanvasMouseUp = () => {
    setDragState(null);
  };

  // ── Element rendering ─────────────────────────────────────────────────────

  const renderElement = element => {
    const editorContext = {
      isSel:  selId === element.id,
      isEdit: editId === element.id,
      dragState, theme,
      onElMouseDown, setEditId, updateElements, activeSl,
    };
    return renderSpec(SLIDE_SHAPES[element.type]?.(element, editorContext));
  };

  // ── Presenter mode ────────────────────────────────────────────────────────

  if (presMode) {
    const presentingSlide = slides[presIdx] || slides[0];
    const advanceOrExit = () => {
      if (presIdx < slides.length - 1) {
        setPresIdx(currentIndex => currentIndex + 1);
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
          background: presentingSlide.bg || "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={advanceOrExit}
      >
        <svg
          viewBox={`0 0 ${SlidesConstants.CANVAS_WIDTH} ${SlidesConstants.CANVAS_HEIGHT}`}
          style={{ width: "90vw", maxWidth: 1200, aspectRatio: "16/9" }}
        >
          <rect width={SlidesConstants.CANVAS_WIDTH} height={SlidesConstants.CANVAS_HEIGHT} fill={presentingSlide.bg || "#fff"} />
          {presentingSlide.elements.map(renderElement)}
        </svg>
        <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", gap: 8 }}>
          <button
            className="nb ng"
            style={{ background: "rgba(0,0,0,0.5)", color: "#fff", border: "none" }}
            onClick={prevClickEvent => {
              prevClickEvent.stopPropagation();
              setPresIdx(currentIndex => Math.max(0, currentIndex - 1));
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
            onClick={nextClickEvent => {
              nextClickEvent.stopPropagation();
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

  const canvasBackground = theme.isDark ? "#1A1A24" : "#D4D4CE";

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Slide thumbnail strip */}
      <div
        style={{
          width: 148,
          background: theme.surface,
          borderRight: `1px solid ${theme.border}`,
          padding: 8,
          overflowY: "auto",
          flexShrink: 0,
        }}
      >
        {slides.map((slide, slideIndex) => (
          <div
            key={slide.id}
            onClick={() => {
              setActiveSl(slideIndex);
              setSelId(null);
              setEditId(null);
            }}
            style={{ marginBottom: 6, cursor: "pointer", position: "relative" }}
          >
            <div
              style={{
                aspectRatio: "16/9",
                background: slide.bg || "#fff",
                border: `2px solid ${slideIndex === activeSl ? appColor : theme.border}`,
                borderRadius: 4,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <svg
                viewBox={`0 0 ${SlidesConstants.CANVAS_WIDTH} ${SlidesConstants.CANVAS_HEIGHT}`}
                style={{ width: "100%", height: "100%", pointerEvents: "none" }}
              >
                <rect width={SlidesConstants.CANVAS_WIDTH} height={SlidesConstants.CANVAS_HEIGHT} fill={slide.bg || "#fff"} />
                {slide.elements.map(element => renderSpec(THUMB_SHAPES[element.type]?.(element)))}
              </svg>
            </div>
            <div
              style={{
                fontSize: 9,
                color: theme.textMuted,
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
              color: theme.textDim,
              border: `1px dashed ${theme.border}`,
              borderRadius: theme.radius6,
              cursor: "pointer",
              background: "transparent",
              fontFamily: theme.fontFamily,
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
              onClick={deleteSlide}
              style={{
                padding: "5px 7px",
                fontSize: 9,
                color: theme.error,
                border: `1px solid ${theme.error}22`,
                borderRadius: theme.radius6,
                cursor: "pointer",
                background: "transparent",
                fontFamily: theme.fontFamily,
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
            borderTop: `1px solid ${theme.border}`,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: theme.textMuted,
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Themes
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {SlidesConstants.SLIDE_THEMES.map(thm => (
              <div
                key={thm.themeId}
                onClick={() => applyTheme(thm)}
                title={thm.label}
                style={{
                  width: 22,
                  height: 14,
                  borderRadius: 3,
                  background: thm.bg,
                  border: `2px solid ${deckTheme.themeId === thm.themeId ? appColor : "transparent"}`,
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
          viewBox={`0 0 ${SlidesConstants.CANVAS_WIDTH} ${SlidesConstants.CANVAS_HEIGHT}`}
          style={{
            width: "min(760px,92%)",
            aspectRatio: "16/9",
            boxShadow: "0 4px 32px rgba(0,0,0,0.25)",
            cursor: "default",
            display: "block",
          }}
          onMouseDown={onCanvasMouseDown}
        >
          <rect width={SlidesConstants.CANVAS_WIDTH} height={SlidesConstants.CANVAS_HEIGHT} fill={curSlide?.bg || "#fff"} />
          {curSlide?.elements.map(renderElement)}
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
          ].map(([elementType, label, ElementIcon]) => (
            <button
              key={elementType}
              onClick={() => addElement(elementType)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                borderRadius: theme.radiusFull,
                background: theme.elevated,
                border: `1px solid ${theme.border}`,
                color: theme.textDim,
                fontSize: 11,
                cursor: "pointer",
                fontFamily: theme.fontFamily,
                gap: 4,
              }}
            >
              <ElementIcon size={12} />
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
              borderRadius: theme.radiusFull,
              background: appColor,
              border: "none",
              color: "white",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: theme.fontFamily,
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
          borderLeft: `1px solid ${theme.border}`,
          padding: 12,
          flexShrink: 0,
          overflowY: "auto",
        }}
      >
        <div className="nsect" style={{ paddingTop: 0 }}>
          Slide {activeSl + 1} of {slides.length}
        </div>
        {!selEl && (
          <div style={{ fontSize: 11, color: theme.textMuted, lineHeight: 1.5 }}>
            Click an element to select it. Double-click text to edit.
          </div>
        )}
        {selEl && (
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: theme.textMuted,
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
                      color: theme.textMuted,
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
                  <span style={{ fontSize: 10, color: theme.textDim }}>{selEl.fontSize}px</span>
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
                        borderRadius: theme.radius6,
                        border: `1px solid ${selEl.align === a ? appColor : theme.border}`,
                        background: selEl.align === a ? appColor + "18" : "transparent",
                        cursor: "pointer",
                        color: selEl.align === a ? appColor : theme.textDim,
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
                      color: theme.textMuted,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Text colour
                  </label>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {[
                      deckTheme.heading,
                      deckTheme.text,
                      deckTheme.accent,
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
                          border: `2px solid ${selEl.color === c ? theme.text : "transparent"}`,
                          outline: `1px solid ${theme.border}`,
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
                      color: theme.textMuted,
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
                          border: `2px solid ${selEl.fill === c ? theme.text : theme.border}`,
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
                borderTop: `1px solid ${theme.border}`,
              }}
            >
              <button
                onClick={deleteSelection}
                className="nb ng"
                style={{
                  width: "100%",
                  fontSize: 11,
                  color: theme.error,
                  borderColor: theme.error + "44",
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
