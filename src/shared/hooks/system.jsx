import { useState, useEffect, useCallback, useRef } from "react";

// ── useDeviceCaps ───────────────────────────────────────────────────────────
// Reports viewport-derived capability flags that can change at runtime
// (window resize, device rotation, etc).

export const useDeviceCaps = () => {
  const measure = () => ({
    isMobile: window.innerWidth < 768,
    isTouch: "ontouchstart" in window || navigator.maxTouchPoints > 0,
  });

  const [caps, setCaps] = useState(measure);

  useEffect(() => {
    const handler = () => {
      setCaps(measure());
    };
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("resize", handler);
    };
  }, []);

  return caps;
};

// ── useKbd ──────────────────────────────────────────────────────────────────
// Binds a Cmd/Ctrl + <key> combo at the window level.

export const useKbd = (key, onTriggered) => {
  useEffect(() => {
    const onKeyDown = keyDownEvent => {
      if ((keyDownEvent.metaKey || keyDownEvent.ctrlKey) && keyDownEvent.key === key) {
        keyDownEvent.preventDefault();
        onTriggered(keyDownEvent);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [key, onTriggered]);
};

// ── useOut ──────────────────────────────────────────────────────────────────
// Fires `onOutsideClick` when a mousedown lands outside the referenced element.

export const useOut = (elementRef, onOutsideClick) => {
  useEffect(() => {
    const onMouseDown = mouseDownEvent => {
      const containerNode = elementRef.current;
      if (containerNode && !containerNode.contains(mouseDownEvent.target)) {
        onOutsideClick();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [elementRef, onOutsideClick]);
};

// ── useVirtualScroll ────────────────────────────────────────────────────────
// Computes a windowed slice of `items` for a scroll container, with a small
// overscan buffer so rows pre-mount before they enter the viewport.

export const useVirtualScroll = (items, itemHeight = 200, containerHeight = 600, columnCount = 1) => {
  const [scrollTop, setScrollTop] = useState(0);

  const totalRows    = Math.ceil(items.length / columnCount);
  const totalHeight  = totalRows * itemHeight;
  const startRow     = Math.max(0, Math.floor(scrollTop / itemHeight) - 1);
  const visibleRows  = Math.ceil(containerHeight / itemHeight) + 3;
  const endRow       = Math.min(totalRows, startRow + visibleRows);
  const startIdx     = startRow * columnCount;
  const endIdx       = Math.min(items.length, endRow * columnCount);

  return {
    onScroll: scrollEvent => setScrollTop(scrollEvent.currentTarget.scrollTop),
    totalH: totalHeight,
    offsetY: startRow * itemHeight,
    visible: items.slice(startIdx, endIdx),
  };
};

// ── useCanvasHistory ────────────────────────────────────────────────────────
// Mutable canvas state behind a `current` / `push` interface. Kept as a hook
// (rather than plain useState) so callers can swap in richer state semantics
// without changing call sites.

export const useCanvasHistory = (initialState) => {
  const [current, setCurrent] = useState(initialState);
  const push = useCallback((nextState) => {
    setCurrent(nextState);
  }, []);
  return { current, push };
};
