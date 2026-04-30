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

export const useKbd = (key, fn) => {
  useEffect(() => {
    const handler = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === key) {
        e.preventDefault();
        fn(e);
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [key, fn]);
};

// ── useOut ──────────────────────────────────────────────────────────────────
// Fires `fn` when a mousedown lands outside the referenced element.

export const useOut = (ref, fn) => {
  useEffect(() => {
    const handler = e => {
      const node = ref.current;
      if (node && !node.contains(e.target)) {
        fn();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, [ref, fn]);
};

// ── useVirtualScroll ────────────────────────────────────────────────────────
// Computes a windowed slice of `items` for a scroll container, with a small
// overscan buffer so rows pre-mount before they enter the viewport.

export const useVirtualScroll = (items, itemH = 200, containerH = 600, cols = 1) => {
  const [scrollTop, setScrollTop] = useState(0);

  const rows = Math.ceil(items.length / cols);
  const totalH = rows * itemH;
  const startRow = Math.max(0, Math.floor(scrollTop / itemH) - 1);
  const visRows = Math.ceil(containerH / itemH) + 3;
  const endRow = Math.min(rows, startRow + visRows);
  const startIdx = startRow * cols;
  const endIdx = Math.min(items.length, endRow * cols);

  return {
    onScroll: e => setScrollTop(e.currentTarget.scrollTop),
    totalH,
    offsetY: startRow * itemH,
    visible: items.slice(startIdx, endIdx),
  };
};

// ── useCanvasHistory ────────────────────────────────────────────────────────
// Mutable canvas state behind a `current` / `push` interface. Kept as a hook
// (rather than plain useState) so callers can swap in richer state semantics
// without changing call sites.

export const useCanvasHistory = (initial) => {
  const [current, setCurrent] = useState(initial);
  const push = useCallback((next) => {
    setCurrent(next);
  }, []);
  return { current, push };
};
