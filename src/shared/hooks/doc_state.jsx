import { useState, useEffect, useRef } from "react";

/**
 * Manages a doc's JSON-serialized content state.
 *
 * - Parses doc.content on init and when doc.id changes.
 * - Calls onContentChange(JSON.stringify(state)) whenever state changes,
 *   skipping the initial mount to avoid a spurious write.
 *
 * @param {object} doc          - The doc object (uses doc.id + doc.content).
 * @param {function} parse      - Pure fn: (rawContent: string) => state.
 * @param {function} onContentChange - Callback to push serialized content up.
 * @returns {[state, setState]} Same shape as useState.
 */
export function useDocState(doc, parse, onContentChange) {
  const [state, setState] = useState(() => parse(doc.content));
  const skipRef = useRef(true);

  useEffect(() => {
    setState(parse(doc.content));
    skipRef.current = true;
  }, [doc.id]); // eslint-disable-line

  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    onContentChange(JSON.stringify(state));
  }, [state]); // eslint-disable-line

  return [state, setState];
}
