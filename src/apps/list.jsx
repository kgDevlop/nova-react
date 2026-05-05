import React, { useState, useEffect, useRef } from "react";
import { I } from "../shared/icons";
import { utils } from "../shared/_utils";
import { ListConstants } from "../shared/_constants";
import { useDocState } from "../shared/hooks/doc_state";

const _newItem = (depth = 0, text = "") => ({
  id: utils._elId(),
  text,
  done: false,
  depth,
});

// Items are stored flat with a `depth` field. The subtree of items[i] runs
// from i (inclusive) to the next index whose depth <= items[i].depth.
const _subtreeEnd = (items, startIndex) => {
  const baseDepth = items[startIndex].depth;
  let endIndex = startIndex + 1;
  for (; endIndex < items.length && items[endIndex].depth > baseDepth; endIndex++) {}
  return endIndex;
};

const _normItem = (raw, fallbackDepth = 0) => ({
  id: typeof raw?.id === "string" ? raw.id : utils._elId(),
  text: typeof raw?.text === "string" ? raw.text : "",
  done: !!raw?.done,
  depth: Math.max(0, Math.min(ListConstants.MAX_DEPTH, Number.isFinite(raw?.depth) ? raw.depth : fallbackDepth)),
});

const _parseContent = (content) => {
  try {
    if (!content) {
      return { todo: [_newItem()], done: [] };
    }
    const parsedContent = JSON.parse(content);
    const todo = Array.isArray(parsedContent?.todo) ? parsedContent.todo.map(item => _normItem(item)) : [];
    const done = Array.isArray(parsedContent?.done) ? parsedContent.done.map(item => _normItem(item)) : [];
    return {
      todo: todo.length ? todo : [_newItem()],
      done,
    };
  } catch {
    return { todo: [_newItem()], done: [] };
  }
};

export const ListEditor = ({ appColor, doc, t: theme, onContentChange, onTitleChange }) => {
  const [view, setView] = useState("todo");
  const [{ todo, done }, setTD] = useDocState(doc, _parseContent, onContentChange);
  // Helper setters that update the merged { todo, done } state.
  const setTodo = (fn) => setTD(prev => ({ ...prev, todo: typeof fn === "function" ? fn(prev.todo) : fn }));
  const setDone = (fn) => setTD(prev => ({ ...prev, done: typeof fn === "function" ? fn(prev.done) : fn }));

  // The id of an item we just created/want to focus next paint.
  const [focusId, setFocusId] = useState(null);
  const inputRefs = useRef({});

  // Title-edit state. A "new" list is one whose doc.content was empty at open;
  // we start with an empty draft so the placeholder shows and we focus the
  // input. For existing lists, the draft mirrors the current title.
  const [titleDraft, setTitleDraft] = useState(() => (doc.content ? doc.title || "" : ""));
  const [titleFocused, setTitleFocused] = useState(false);
  const titleRef = useRef(null);
  const isNewDoc = useRef(!doc.content);

  // On doc switch, reset non-content UI state (useDocState handles content).
  useEffect(() => {
    isNewDoc.current = !doc.content;
    setTitleDraft(doc.content ? doc.title || "" : "");
  }, [doc.id]);

  // Auto-focus the title input on a freshly-created list so the user can name
  // it without an extra click.
  useEffect(() => {
    if (isNewDoc.current && titleRef.current) {
      titleRef.current.focus();
    }
  }, [doc.id]);

  const commitTitle = () => {
    const newTitle = titleDraft.trim();
    if (newTitle && newTitle !== doc.title) {
      onTitleChange?.(newTitle);
    } else if (!newTitle) {
      // User cleared the field — revert the draft so the placeholder reflects
      // the current saved title rather than leaving an empty input.
      setTitleDraft(doc.title || "");
    }
  };

  // Focus newly created item's input.
  useEffect(() => {
    if (focusId && inputRefs.current[focusId]) {
      const newListItem = inputRefs.current[focusId];
      newListItem.focus();
      const nliLength = newListItem.value.length;
      try {
        newListItem.setSelectionRange(nliLength, nliLength);
      } catch {
        // Ignore — some browsers throw on hidden/disconnected inputs.
      }
      setFocusId(null);
    }
  }, [focusId]);

  const items = view === "todo" ? todo : done;
  const setItems = view === "todo" ? setTodo : setDone;

  const updateText = (itemIndex, text) => {
    setItems(prev => prev.map((listItem, currentIndex) => (currentIndex === itemIndex ? { ...listItem, text } : listItem)));
  };

  // Checking an item in "todo" moves its entire subtree to "done":
  //   - the clicked item becomes done=true (root)
  //   - children retain their existing done state
  //   - depths are normalised so the moved root sits at depth 0
  // In "done", only top-level items can move back to todo on uncheck.
  // Child items in "done" simply toggle their own done state in place.
  const toggleDone = (idx) => {
    if (view === "todo") {
      setTD(prev => {
        const subtreeEnd = _subtreeEnd(prev.todo, idx);
        const subtree = prev.todo.slice(idx, subtreeEnd);
        const baseDepth = subtree[0].depth;
        const movedSubtree = subtree.map((item, subIdx) => ({
          ...item,
          depth: item.depth - baseDepth,
          done: subIdx === 0 ? true : item.done,
        }));
        return {
          todo: [...prev.todo.slice(0, idx), ...prev.todo.slice(subtreeEnd)],
          done: [...prev.done, ...movedSubtree],
        };
      });
      return;
    }

    const clickedItem = done[idx];
    if (clickedItem.depth === 0) {
      setTD(prev => {
        const subtreeEnd = _subtreeEnd(prev.done, idx);
        const subtree = prev.done.slice(idx, subtreeEnd);
        const movedSubtree = subtree.map((item, subIdx) => ({ ...item, done: subIdx === 0 ? false : item.done }));
        return {
          todo: [...prev.todo, ...movedSubtree],
          done: [...prev.done.slice(0, idx), ...prev.done.slice(subtreeEnd)],
        };
      });
    } else {
      setDone(prev => prev.map((item, itemIdx) => (itemIdx === idx ? { ...item, done: !item.done } : item)));
    }
  };

  // Indent / outdent moves the entire subtree by `delta`. Indent is only
  // legal when the previous item exists and its depth >= current depth
  // (so the moved subtree has a valid parent to attach under).
  const shiftDepth = (idx, delta) => {
    setItems(prev => {
      const currentItem = prev[idx];
      const newDepth = currentItem.depth + delta;
      if (newDepth < 0 || newDepth > ListConstants.MAX_DEPTH) {
        return prev;
      }
      if (delta > 0) {
        if (idx === 0) {
          return prev;
        }
        const previousItem = prev[idx - 1];
        if (previousItem.depth < currentItem.depth) {
          return prev;
        }
      }
      const subtreeEnd = _subtreeEnd(prev, idx);
      return prev.map((item, itemIdx) => {
        if (itemIdx >= idx && itemIdx < subtreeEnd) {
          return { ...item, depth: item.depth + delta };
        }
        return item;
      });
    });
  };

  // New sibling inserted just after this item's subtree, at the same depth.
  const addSiblingAfter = (idx) => {
    setItems(prev => {
      const currentItem = prev[idx];
      const insertIndex = _subtreeEnd(prev, idx);
      const newItem = _newItem(currentItem.depth);
      setFocusId(newItem.id);
      return [...prev.slice(0, insertIndex), newItem, ...prev.slice(insertIndex)];
    });
  };

  // Backspace on an empty item removes it (and its subtree, but if it's empty
  // it has no meaningful children — we still remove the subtree to be safe).
  const removeItem = (idx) => {
    setItems(prev => {
      const subtreeEnd = _subtreeEnd(prev, idx);
      // Keep at least one row in todo so the doc never appears blank.
      if (view === "todo" && prev.length === subtreeEnd - idx) {
        return prev;
      }
      if (idx > 0) {
        const previousItem = prev[idx - 1];
        setFocusId(previousItem.id);
      } else if (subtreeEnd < prev.length) {
        const nextItem = prev[subtreeEnd];
        setFocusId(nextItem.id);
      }
      return [...prev.slice(0, idx), ...prev.slice(subtreeEnd)];
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
        <input
          ref={titleRef}
          value={titleDraft}
          onChange={e => setTitleDraft(e.target.value)}
          onFocus={() => setTitleFocused(true)}
          onBlur={() => {
            setTitleFocused(false);
            commitTitle();
          }}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitTitle();
              titleRef.current?.blur();
            } else if (e.key === "Escape") {
              setTitleDraft(doc.title || "");
              titleRef.current?.blur();
            }
          }}
          onMouseEnter={e => {
            if (document.activeElement !== e.currentTarget) {
              e.currentTarget.style.background = appColor + "14";
              e.currentTarget.style.borderColor = appColor + "55";
            }
          }}
          onMouseLeave={e => {
            if (document.activeElement !== e.currentTarget) {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "transparent";
            }
          }}
          placeholder="Untitled list"
          title="Click to rename"
          style={{
            width: "100%",
            background: titleFocused ? theme.surface : "transparent",
            border: `1px solid ${titleFocused ? appColor : "transparent"}`,
            borderRadius: theme.radius10,
            outline: "none",
            color: theme.text,
            fontSize: 24,
            fontWeight: 800,
            fontFamily: theme.fontFamily,
            letterSpacing: "-0.02em",
            padding: "6px 10px",
            margin: "0 -10px 14px",
            cursor: titleFocused ? "text" : "pointer",
            boxShadow: titleFocused ? `0 0 0 3px ${appColor}22` : "none",
            transition: theme.transition,
          }}
        />
        <div
          style={{
            display: "flex",
            gap: 2,
            marginBottom: 16,
            borderBottom: `1px solid ${theme.border}`,
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
                  color: active ? theme.text : theme.textMuted,
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontFamily: theme.fontFamily,
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
                    color: active ? appColor : theme.textMuted,
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
              color: theme.textMuted,
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
                onDelete={() => removeItem(idx)}
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
            e.currentTarget.style.color = theme.textDim;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = theme.border;
            e.currentTarget.style.color = theme.textMuted;
          }}
          style={{
            marginTop: 14,
            padding: "8px 12px",
            background: "transparent",
            border: `1px dashed ${theme.border}`,
            borderRadius: theme.radius10,
            color: theme.textMuted,
            fontSize: 12,
            fontFamily: theme.fontFamily,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: theme.transition,
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
  onDelete,
}) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        paddingLeft: item.depth * ListConstants.INDENT_PX,
        padding: `2px 0 2px ${item.depth * ListConstants.INDENT_PX}px`,
      }}
    >
      <button
        onClick={onToggle}
        title={item.done ? "Mark incomplete" : "Mark complete"}
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          border: `1.5px solid ${item.done ? appColor : theme.border}`,
          background: item.done ? appColor : "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          padding: 0,
          transition: theme.transition,
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
            const depthDelta = e.shiftKey ? -1 : 1;
            onIndent(depthDelta);
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
          color: item.done ? theme.textMuted : theme.text,
          textDecoration: item.done ? "line-through" : "none",
          fontSize: 13,
          fontFamily: theme.fontFamily,
          padding: "5px 0",
          minWidth: 0,
        }}
      />
      <button
        onClick={onDelete}
        title="Delete item"
        onMouseEnter={e => {
          e.currentTarget.style.color = appColor;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = theme.textMuted;
        }}
        style={{
          width: 24,
          height: 24,
          background: "transparent",
          border: "none",
          borderRadius: 5,
          color: theme.textMuted,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          padding: 0,
          opacity: hover ? 1 : 0,
          pointerEvents: hover ? "auto" : "none",
          transition: theme.transition,
        }}
      >
        <I.Trash size={13} />
      </button>
    </div>
  );
};
