import { useState, useCallback, useEffect, useRef } from "react";
import { NovaBaseConstants } from "../_constants";

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

const sameEntry = (firstEntry, secondEntry) =>
  Boolean(firstEntry)
  && Boolean(secondEntry)
  && firstEntry.kind === secondEntry.kind
  && firstEntry.id === secondEntry.id;

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
  const callbacksRef = useRef({ apply, isValid });
  callbacksRef.current = { apply, isValid };

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
    const prevState = stateRef.current;
    if (sameEntry(prevState.entries[prevState.idx], entry)) {
      return;
    }
    const truncatedEntries = prevState.entries.slice(0, prevState.idx + 1);
    truncatedEntries.push(entry);
    const trimmedEntries = truncatedEntries.slice(-NovaBaseConstants.HIST_LIMIT);
    const newIdx = trimmedEntries.length - 1;
    const nextState = { entries: trimmedEntries, idx: newIdx };
    stateRef.current = nextState;
    window.history.pushState({ navIdx: newIdx }, "");
    setState(nextState);
  }, []);

  // Replace the current entry in place — useful when the active page changed
  // implicitly (e.g. closing a tab promotes a neighbour) and the stack should
  // reflect that without growing.
  const replace = useCallback(entry => {
    const prevState = stateRef.current;
    if (sameEntry(prevState.entries[prevState.idx], entry)) {
      return;
    }
    const entries = prevState.entries.slice();
    entries[prevState.idx] = entry;
    const nextState = { entries, idx: prevState.idx };
    stateRef.current = nextState;
    window.history.replaceState({ navIdx: prevState.idx }, "");
    setState(nextState);
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
    const onPopState = popStateEvent => {
      const targetIdx = popStateEvent.state?.navIdx;
      if (typeof targetIdx !== "number") {
        return;
      }
      const prevState = stateRef.current;
      const clampedIdx = Math.max(0, Math.min(prevState.entries.length - 1, targetIdx));
      if (clampedIdx === prevState.idx) {
        return;
      }
      // Skip past invalid entries (deleted docs) in the travel direction so
      // the user never lands on a missing page.
      const direction = clampedIdx > prevState.idx ? 1 : -1;
      let walkIdx = clampedIdx;
      for (
        ;
        walkIdx >= 0
        && walkIdx < prevState.entries.length
        && !callbacksRef.current.isValid(prevState.entries[walkIdx]);
        walkIdx += direction
      ) {}
      if (walkIdx < 0 || walkIdx >= prevState.entries.length) {
        return;
      }
      callbacksRef.current.apply(prevState.entries[walkIdx]);
      const nextState = { entries: prevState.entries, idx: walkIdx };
      stateRef.current = nextState;
      setState(nextState);
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
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
