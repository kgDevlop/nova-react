import { useState, useCallback, useEffect, useRef } from "react";
import { nova_base as nova_baseConst } from "../_constants";

// ── Navigation history ────────────────────────────────────────────────────
//
// Owns a linear history stack and mirrors it onto window.history so OS-level
// back gestures (mobile swipe, browser back, keyboard) and in-app buttons
// flow through a single pipeline.
//
// Each entry is one of:
//   { kind: "view", id: "home" | "writer" | "starred" | "catalogue" | ... }
//   { kind: "doc",  id: "<doc-id>" }
//
// Forward navigation is push-driven: callers invoke `push(entry)` whenever the
// user opens an app, switches to a list view, or opens a document. Back and
// forward navigation are pull-driven: the hook calls `apply(entry)` so the
// caller can update its own state (active tab, selected view) without
// reactively watching the nav stack.
//
// Entries that fail `isValid` (typically deleted docs) are skipped over in
// the navigation direction so back/forward never strand the user on a missing
// page.

const sameEntry = (a, b) =>
  Boolean(a) && Boolean(b) && a.kind === b.kind && a.id === b.id;

export const useNavHistory = ({ apply, isValid, initial }) => {
  const [state, setState] = useState(() => ({
    entries: [initial ?? { kind: "view", id: "home" }],
    idx: 0,
  }));

  // Mirror state to a ref so synchronous callers (push from event handlers)
  // can read the latest stack without waiting for a re-render. Updated inside
  // every state mutation site below, so it never lags behind setState.
  const stateRef = useRef(state);

  // Latest callbacks via ref so the hook's own functions can stay referentially
  // stable while still calling the freshest closure.
  const cbRef = useRef({ apply, isValid });
  cbRef.current = { apply, isValid };

  // Tag the initial browser entry so popstate on first interaction sees a
  // recognisable state object.
  useEffect(() => {
    if (window.history.state?.navIdx === undefined) {
      window.history.replaceState({ navIdx: 0 }, "");
    }
  }, []);

  // Push a new entry, truncating any forward stack. No-op when the entry
  // matches the current page (prevents duplicate entries from repeated clicks
  // on an already-active sidebar item).
  const push = useCallback(entry => {
    const prev = stateRef.current;
    if (sameEntry(prev.entries[prev.idx], entry)) {
      return;
    }
    const truncated = prev.entries.slice(0, prev.idx + 1);
    truncated.push(entry);
    const trimmed = truncated.slice(-nova_baseConst.HIST_LIMIT);
    const newIdx = trimmed.length - 1;
    const next = { entries: trimmed, idx: newIdx };
    stateRef.current = next;
    window.history.pushState({ navIdx: newIdx }, "");
    setState(next);
  }, []);

  // Replace the current entry in place — useful when the active page changed
  // implicitly (e.g. closing a tab promotes a neighbour) and the stack should
  // reflect that without growing.
  const replace = useCallback(entry => {
    const prev = stateRef.current;
    if (sameEntry(prev.entries[prev.idx], entry)) {
      return;
    }
    const entries = prev.entries.slice();
    entries[prev.idx] = entry;
    const next = { entries, idx: prev.idx };
    stateRef.current = next;
    window.history.replaceState({ navIdx: prev.idx }, "");
    setState(next);
  }, []);

  // Back/forward delegate to the browser. The popstate handler is the single
  // place where we apply entries and shift idx, so every back-flavoured input
  // (button, swipe, keyboard) takes the same path.
  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  const goForward = useCallback(() => {
    window.history.forward();
  }, []);

  useEffect(() => {
    const onPop = e => {
      const target = e.state?.navIdx;
      if (typeof target !== "number") {
        return;
      }
      const prev = stateRef.current;
      const clamped = Math.max(0, Math.min(prev.entries.length - 1, target));
      if (clamped === prev.idx) {
        return;
      }
      // Skip past invalid entries (deleted docs) in the travel direction so
      // the user never lands on a missing page.
      const dir = clamped > prev.idx ? 1 : -1;
      let i = clamped;
      while (
        i >= 0 &&
        i < prev.entries.length &&
        !cbRef.current.isValid(prev.entries[i])
      ) {
        i += dir;
      }
      if (i < 0 || i >= prev.entries.length) {
        return;
      }
      cbRef.current.apply(prev.entries[i]);
      const next = { entries: prev.entries, idx: i };
      stateRef.current = next;
      setState(next);
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  return {
    canBack: state.idx > 0,
    canForward: state.idx < state.entries.length - 1,
    current: state.entries[state.idx],
    push,
    replace,
    goBack,
    goForward,
  };
};
