import React, { useState, useEffect, useRef } from "react";
import { I } from "../shared/icons";
import { _elId } from "../shared/utils";

// Tree depth cap (15 levels: root + 14 nested children).
const MAX_DEPTH = 14;
const INDENT_PX = 22;

const _newItem = (depth = 0, text = "") => ({
  id: _elId(),
  text,
  done: false,
  depth,
});

// Items are stored flat with a `depth` field. The subtree of items[i] runs
// from i (inclusive) to the next index whose depth <= items[i].depth.
const _subtreeEnd = (items, i) => {
  const baseDepth = items[i].depth;
  let j = i + 1;
  while (j < items.length && items[j].depth > baseDepth) {
    j++;
  }
  return j;
};

const _normItem = (raw, fallbackDepth = 0) => ({
  id: typeof raw?.id === "string" ? raw.id : _elId(),
  text: typeof raw?.text === "string" ? raw.text : "",
  done: !!raw?.done,
  depth: Math.max(0, Math.min(MAX_DEPTH, Number.isFinite(raw?.depth) ? raw.depth : fallbackDepth)),
});

const _parseContent = (content) => {
  try {
    if (!content) {
      return { todo: [_newItem()], done: [] };
    }
    const p = JSON.parse(content);
    const todo = Array.isArray(p?.todo) ? p.todo.map(it => _normItem(it)) : [];
    const done = Array.isArray(p?.done) ? p.done.map(it => _normItem(it)) : [];
    return {
      todo: todo.length ? todo : [_newItem()],
      done,
    };
  } catch {
    return { todo: [_newItem()], done: [] };
  }
};

export const ListEditor = ({ appColor, doc, t: theme, onContentChange, registerActions }) => {
  const [view, setView] = useState("todo");
  const [todo, setTodo] = useState(() => _parseContent(doc.content).todo);
  const [done, setDone] = useState(() => _parseContent(doc.content).done);
  // The id of an item we just created/want to focus next paint.
  const [focusId, setFocusId] = useState(null);
  const inputRefs = useRef({});
  // Skip the first save effect — initial state already reflects doc.content.
  const initialMount = useRef(true);

  // Reload state when switching documents.
  useEffect(() => {
    const parsed = _parseContent(doc.content);
    setTodo(parsed.todo);
    setDone(parsed.done);
    initialMount.current = true;
  }, [doc.id]);

  // Persist on any change. Skip the initial render (and re-mount per doc.id).
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    onContentChange(JSON.stringify({ todo, done }));
  }, [todo, done]); // eslint-disable-line

  // Focus newly created item's input.
  useEffect(() => {
    if (focusId && inputRefs.current[focusId]) {
      const el = inputRefs.current[focusId];
      el.focus();
      const len = el.value.length;
      try {
        el.setSelectionRange(len, len);
      } catch {
        // Ignore — some browsers throw on hidden/disconnected inputs.
      }
      setFocusId(null);
    }
  }, [focusId]);

  // Toolbar wiring. Re-register on every state change so the closure sees
  // the latest `view`/`todo`/`done` when toolbar buttons fire.
  useEffect(() => {
    registerActions((id) => {
      if (id === "addItem") {
        const items = view === "todo" ? todo : done;
        const setItems = view === "todo" ? setTodo : setDone;
        const newItem = _newItem(0);
        setItems([...items, newItem]);
        setFocusId(newItem.id);
      } else if (id === "clearDone") {
        if (done.length > 0) {
          setDone([]);
        }
      }
    });
  }, [view, todo, done]); // eslint-disable-line

  const items = view === "todo" ? todo : done;
  const setItems = view === "todo" ? setTodo : setDone;

  const updateText = (idx, text) => {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, text } : it)));
  };

  // Checking an item in "todo" moves its entire subtree to "done":
  //   - the clicked item becomes done=true (root)
  //   - children retain their existing done state
  //   - depths are normalised so the moved root sits at depth 0
  // In "done", only top-level items can move back to todo on uncheck.
  // Child items in "done" simply toggle their own done state in place.
  const toggleDone = (idx) => {
    if (view === "todo") {
      setTodo(prev => {
        const end = _subtreeEnd(prev, idx);
        const subtree = prev.slice(idx, end);
        const baseDepth = subtree[0].depth;
        const moved = subtree.map((it, i) => ({
          ...it,
          depth: it.depth - baseDepth,
          done: i === 0 ? true : it.done,
        }));
        setDone(d => [...d, ...moved]);
        return [...prev.slice(0, idx), ...prev.slice(end)];
      });
      return;
    }

    const item = done[idx];
    if (item.depth === 0) {
      setDone(prev => {
        const end = _subtreeEnd(prev, idx);
        const subtree = prev.slice(idx, end);
        const moved = subtree.map((it, i) => ({
          ...it,
          done: i === 0 ? false : it.done,
        }));
        setTodo(t => [...t, ...moved]);
        return [...prev.slice(0, idx), ...prev.slice(end)];
      });
    } else {
      setDone(prev => prev.map((it, i) => (i === idx ? { ...it, done: !it.done } : it)));
    }
  };

  // Indent / outdent moves the entire subtree by `delta`. Indent is only
  // legal when the previous item exists and its depth >= current depth
  // (so the moved subtree has a valid parent to attach under).
  const shiftDepth = (idx, delta) => {
    setItems(prev => {
      const item = prev[idx];
      const newDepth = item.depth + delta;
      if (newDepth < 0 || newDepth > MAX_DEPTH) {
        return prev;
      }
      if (delta > 0) {
        if (idx === 0) {
          return prev;
        }
        if (prev[idx - 1].depth < item.depth) {
          return prev;
        }
      }
      const end = _subtreeEnd(prev, idx);
      return prev.map((it, i) => {
        if (i >= idx && i < end) {
          return { ...it, depth: it.depth + delta };
        }
        return it;
      });
    });
  };

  // New sibling inserted just after this item's subtree, at the same depth.
  const addSiblingAfter = (idx) => {
    setItems(prev => {
      const item = prev[idx];
      const end = _subtreeEnd(prev, idx);
      const newItem = _newItem(item.depth);
      setFocusId(newItem.id);
      return [...prev.slice(0, end), newItem, ...prev.slice(end)];
    });
  };

  // Backspace on an empty item removes it (and its subtree, but if it's empty
  // it has no meaningful children — we still remove the subtree to be safe).
  const removeItem = (idx) => {
    setItems(prev => {
      const end = _subtreeEnd(prev, idx);
      // Keep at least one row in todo so the doc never appears blank.
      if (view === "todo" && prev.length === end - idx) {
        return prev;
      }
      if (idx > 0) {
        setFocusId(prev[idx - 1].id);
      } else if (end < prev.length) {
        setFocusId(prev[end].id);
      }
      return [...prev.slice(0, idx), ...prev.slice(end)];
    });
  };

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: "28px 24px 48px",
        background: theme.bg,
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            gap: 2,
            marginBottom: 16,
            borderBottom: `1px solid ${theme.bd}`,
          }}
        >
          {[
            ["todo", "To Do", todo.length],
            ["done", "Done", done.length],
          ].map(([key, label, count]) => {
            const active = view === key;
            return (
              <button
                key={key}
                onClick={() => setView(key)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${active ? appColor : "transparent"}`,
                  color: active ? theme.tx : theme.tm,
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontFamily: theme.fn,
                  marginBottom: -1,
                  outline: "none",
                }}
              >
                {label}
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: active ? appColor : theme.tm,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {items.length === 0 ? (
          <div
            style={{
              color: theme.tm,
              fontSize: 13,
              padding: "32px 8px",
              textAlign: "center",
            }}
          >
            {view === "todo"
              ? "Nothing to do yet."
              : "No completed items yet."}
          </div>
        ) : (
          <div>
            {items.map((item, idx) => (
              <ListItem
                key={item.id}
                item={item}
                appColor={appColor}
                theme={theme}
                inputRef={el => {
                  if (el) {
                    inputRefs.current[item.id] = el;
                  } else {
                    delete inputRefs.current[item.id];
                  }
                }}
                onTextChange={text => updateText(idx, text)}
                onToggle={() => toggleDone(idx)}
                onIndent={delta => shiftDepth(idx, delta)}
                onEnter={() => addSiblingAfter(idx)}
                onBackspaceEmpty={() => removeItem(idx)}
              />
            ))}
          </div>
        )}

        <button
          onClick={() => {
            const newItem = _newItem(0);
            setItems(prev => [...prev, newItem]);
            setFocusId(newItem.id);
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = appColor + "55";
            e.currentTarget.style.color = theme.ts;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = theme.bd;
            e.currentTarget.style.color = theme.tm;
          }}
          style={{
            marginTop: 14,
            padding: "8px 12px",
            background: "transparent",
            border: `1px dashed ${theme.bd}`,
            borderRadius: theme.r10,
            color: theme.tm,
            fontSize: 12,
            fontFamily: theme.fn,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: theme.tr,
          }}
        >
          <I.Plus size={12} /> Add item
        </button>
      </div>
    </div>
  );
};

const ListItem = ({
  item,
  appColor,
  theme,
  inputRef,
  onTextChange,
  onToggle,
  onIndent,
  onEnter,
  onBackspaceEmpty,
}) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        paddingLeft: item.depth * INDENT_PX,
        padding: `2px 0 2px ${item.depth * INDENT_PX}px`,
      }}
    >
      <button
        onClick={onToggle}
        title={item.done ? "Mark incomplete" : "Mark complete"}
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          border: `1.5px solid ${item.done ? appColor : theme.bd}`,
          background: item.done ? appColor : "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          padding: 0,
          transition: theme.tr,
        }}
      >
        {item.done && <I.Check size={11} color="#fff" />}
      </button>
      <input
        ref={inputRef}
        value={item.text}
        onChange={e => onTextChange(e.target.value)}
        placeholder="List item"
        onKeyDown={e => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter();
          } else if (e.key === "Tab") {
            e.preventDefault();
            onIndent(e.shiftKey ? -1 : 1);
          } else if (e.key === "Backspace" && item.text === "") {
            e.preventDefault();
            onBackspaceEmpty();
          }
        }}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          color: item.done ? theme.tm : theme.tx,
          textDecoration: item.done ? "line-through" : "none",
          fontSize: 13,
          fontFamily: theme.fn,
          padding: "5px 0",
          minWidth: 0,
        }}
      />
    </div>
  );
};
