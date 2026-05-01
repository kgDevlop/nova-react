import React, { useState, useEffect, useRef } from "react";
import { I } from "../shared/icons";
import { AppsSidebar, DefaultSections, MobileToolbarPanel } from "../shared/apps_sidebar";
import { writer as C } from "../shared/_constants";

// One 8.5×11 paper sheet. The inner contentEditable is height-clipped to the
// page's content area; the parent (WriterEditor) detects overflow on this
// element and reflows trailing block-level children onto the next Page.
const Page = React.forwardRef(function Page(
  {
    theme,
    paperWidth,
    paddingTop,
    paddingBottom,
    paddingHorizontal,
    contentHeight,
    paperBackground,
    isDark,
    isLast,
    onInput,
    onKeyDown,
    onBlur,
    onFocus,
  },
  ref,
) {
  return (
    <div
      style={{
        width: paperWidth,
        background: paperBackground,
        borderRadius: 3,
        boxShadow: isDark ? "none" : "0 1px 16px rgba(0,0,0,0.07)",
        padding: `${paddingTop}px ${paddingHorizontal}px ${paddingBottom}px`,
        flexShrink: 0,
        marginBottom: isLast ? 0 : 24,
        alignSelf: "center",
      }}
    >
      <div
        ref={ref}
        className="nova-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={onInput}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        onFocus={onFocus}
        style={{
          outline: "none",
          // Fix the editable area's height so overflow is observable.
          minHeight: contentHeight,
          maxHeight: contentHeight,
          overflow: "hidden",
          fontFamily: "Georgia,'Times New Roman',serif",
          fontSize: 16,
          lineHeight: 1.85,
          color: theme.tx,
        }}
      />
    </div>
  );
});

export const WriterEditor = ({
  appColor,
  doc,
  t: theme,
  onContentChange,
  registerActions,
  isMobile,
  onBack,
  saveStatus,
  activeWS,
  onTitleChange,
}) => {
  const containerRef = useRef(null);
  const pageRefs = useRef([]);
  // Last known caret range, captured on blur so toolbar clicks can restore it.
  const savedSelection = useRef(null);
  // Selection captured when the link modal was opened — restored on confirm.
  const linkRangeRef = useRef(null);
  // Index of the page that currently has (or last had) focus.
  const activePageIdx = useRef(0);
  // Set when rebalance() needs another pass after a new page mounts.
  const pendingRebalance = useRef(false);
  // Cursor location to restore once a deferred rebalance completes.
  const pendingCursor = useRef(null);

  const [pageCount, setPageCount] = useState(1);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkInputRef = useRef(null);

  // Fixed paper dimensions — the page never reflows to viewport width. The
  // canvas container has overflow:auto so narrow viewports get scrollbars.
  const paperWidth = C.PAPER_MAX_WIDTH;
  const pageHeight = paperWidth * C.PAGE_HEIGHT_RATIO;
  const padTop = paperWidth * C.MARGIN_TOP_RATIO;
  const padBottom = paperWidth * C.MARGIN_BOTTOM_RATIO;
  const padHorizontal = paperWidth * C.MARGIN_HORIZONTAL_RATIO;
  const contentHeight = pageHeight - padTop - padBottom;
  const canvasBackground = theme.dk ? "#0C0C10" : "#E8E8E2";
  const paperBackground = theme.dk ? theme.el : "#fff";

  // ── Editor element accessors ──────────────────────────────────────────────

  const activeEditor = () => {
    return pageRefs.current[activePageIdx.current] || pageRefs.current[0];
  };

  const allEditors = () => {
    return pageRefs.current.filter(Boolean);
  };

  const combinedHTML = () => {
    return allEditors().map(e => e.innerHTML).join("");
  };

  const combinedText = () => {
    return allEditors().map(e => e.innerText || "").join("\n");
  };

  const updateCounts = () => {
    const text = combinedText();
    setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
    setCharCount(text.length);
  };

  // ── Pagination ────────────────────────────────────────────────────────────
  //
  // rebalance() walks every page and:
  //   1. Pushes overflowing trailing blocks onto the next page.
  //   2. If the next page doesn't exist yet, schedules a re-run after we add
  //      one (we can't append to a page that hasn't mounted).
  //   3. Pulls blocks back from the next page when there's room here.
  //   4. Trims trailing empty pages.
  //
  // DOM nodes are MOVED (re-parented), not recreated, so React state inside
  // them (selection, IME composition) survives the move.
  //
  // The cursor's container is captured up front, then re-focused at the end:
  // when a block moves to a new page, focus stays on the old (now-empty) page
  // unless we explicitly chase the container to wherever it ended up.
  const rebalance = () => {
    const sel = window.getSelection();
    let cursorContainer = null;
    let cursorOffset = 0;
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      cursorContainer = range.startContainer;
      cursorOffset = range.startOffset;
    }

    let needsMorePages = false;
    let i = 0;
    while (i < pageCount) {
      const editor = pageRefs.current[i];
      if (!editor) {
        i++;
        continue;
      }

      // Push trailing blocks forward while this page overflows. Always leave
      // at least one child so the page never becomes empty mid-loop.
      while (editor.scrollHeight > contentHeight + 1 && editor.children.length > 1) {
        const lastBlock = editor.lastElementChild;
        const nextEditor = pageRefs.current[i + 1];
        if (!nextEditor) {
          needsMorePages = true;
          break;
        }
        nextEditor.insertBefore(lastBlock, nextEditor.firstChild);
      }
      if (needsMorePages) {
        break;
      }

      // Pull blocks back from the next page if there's still room here.
      // Stop the moment a pulled block makes us overflow — and put it back.
      const nextEditor = pageRefs.current[i + 1];
      if (nextEditor) {
        while (nextEditor.firstElementChild) {
          const candidate = nextEditor.firstElementChild;
          editor.appendChild(candidate);
          if (editor.scrollHeight > contentHeight + 1) {
            nextEditor.insertBefore(candidate, nextEditor.firstChild);
            break;
          }
        }
      }
      i++;
    }

    if (needsMorePages) {
      pendingRebalance.current = true;
      pendingCursor.current = { container: cursorContainer, offset: cursorOffset };
      setPageCount(c => c + 1);
      return;
    }

    // Trim trailing empty pages (always keep at least one).
    let trim = 0;
    for (let j = pageCount - 1; j > 0; j--) {
      const ed = pageRefs.current[j];
      const isEmpty = ed && ed.children.length === 0 && !(ed.textContent || "").trim();
      if (isEmpty) {
        trim++;
      } else {
        break;
      }
    }
    if (trim > 0) {
      setPageCount(c => Math.max(1, c - trim));
    }

    restoreCursorTo(cursorContainer, cursorOffset);
  };

  const restoreCursorTo = (container, offset) => {
    if (!container || !document.contains(container)) {
      return;
    }
    const pageIdx = pageRefs.current.findIndex(e => e && e.contains(container));
    if (pageIdx < 0) {
      return;
    }
    activePageIdx.current = pageIdx;
    pageRefs.current[pageIdx].focus();
    try {
      const range = document.createRange();
      // Clamp the offset — the container's contents may have shifted.
      const containerLength = container.nodeType === 3
        ? container.length
        : container.childNodes.length;
      const safeOffset = Math.min(offset, containerLength);
      range.setStart(container, safeOffset);
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      savedSelection.current = range.cloneRange();
    } catch {
      // Ignore range errors from rapid edits — next input will recompute.
    }
  };

  // After setPageCount triggers a re-render and the new page mounts,
  // continue the deferred rebalance.
  useEffect(() => {
    if (!pendingRebalance.current) {
      return;
    }
    pendingRebalance.current = false;
    rebalance();
    if (pendingCursor.current) {
      const { container, offset } = pendingCursor.current;
      pendingCursor.current = null;
      restoreCursorTo(container, offset);
    }
    onContentChange(combinedHTML());
    updateCounts();
  }, [pageCount]); // eslint-disable-line

  // Load doc into page 0; rebalance distributes overflow forward.
  useEffect(() => {
    if (!pageRefs.current[0]) {
      return;
    }
    pageRefs.current.forEach((e, i) => {
      if (!e) {
        return;
      }
      if (i === 0) {
        e.innerHTML = doc.content || "";
      } else {
        e.innerHTML = "";
      }
    });
    rebalance();
    updateCounts();
  }, [doc.id]); // eslint-disable-line

  // ── Selection bookkeeping ─────────────────────────────────────────────────

  const handleBlur = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      return;
    }
    const node = sel.anchorNode;
    // Only persist the selection if it's inside one of our editor pages —
    // otherwise we'd capture clicks into the toolbar/modal.
    const insideEditor = allEditors().some(e => e.contains(node));
    if (insideEditor) {
      savedSelection.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const handleFocus = idx => {
    activePageIdx.current = idx;
  };

  // Restore the last known caret position so toolbar clicks/menu actions
  // act on the user's prior selection rather than the now-blurred editor.
  const restoreSelection = () => {
    activeEditor()?.focus();
    const ssc = savedSelection.current;
    if (!ssc) {
      return false;
    }
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(ssc);
    }
    return true;
  };

  // execCommand is deprecated but is still the most reliable way to apply
  // inline formatting inside contentEditable across browsers.
  const execCmd = (cmd, val = null) => {
    restoreSelection();
    document.execCommand(cmd, false, val);
  };

  // ── Block manipulation helpers ────────────────────────────────────────────

  // Walk up from the selection's anchor and return the nearest ancestor
  // matching one of the given tag names — stops at the editor boundary.
  const nearestAncestor = tagNames => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      return null;
    }
    const tags = tagNames.map(t => t.toUpperCase());
    const editor = activeEditor();
    let node = sel.anchorNode;
    while (node && node !== editor) {
      if (node.nodeType === 1 && tags.includes(node.tagName)) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  };

  // Top-level block elements within the active editor that intersect `range`.
  // Falls back to the block containing the selection if the range is collapsed.
  const blocksInRange = range => {
    const editor = activeEditor();
    if (!editor || !range) {
      return [];
    }
    const blocks = [];
    for (const child of Array.from(editor.childNodes)) {
      if (child.nodeType !== 1) {
        continue;
      }
      const childRange = document.createRange();
      childRange.selectNode(child);
      // Compare bounds: the child overlaps the selection if it starts before
      // the selection's end AND ends after the selection's start.
      const startsBeforeEnd = range.compareBoundaryPoints(Range.END_TO_START, childRange) < 0;
      const endsAfterStart = range.compareBoundaryPoints(Range.START_TO_END, childRange) > 0;
      if (startsBeforeEnd && endsAfterStart) {
        blocks.push(child);
      }
    }
    if (blocks.length === 0) {
      // Collapsed selection — find the top-level block ancestor of the caret.
      let node = range.startContainer;
      while (node && node.parentNode !== editor) {
        node = node.parentNode;
      }
      if (node && node !== editor) {
        blocks.push(node);
      }
    }
    return blocks;
  };

  // Toggle the selected blocks into/out of a list. Behaviour:
  //   • All blocks already in the target list → unwrap to <p>s.
  //   • Blocks in the OTHER list type        → convert to target list.
  //   • Mixed / non-list blocks              → wrap in target list.
  const toggleList = listTag => {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      return;
    }
    const range = sel.getRangeAt(0);
    const otherTag = listTag === "UL" ? "OL" : "UL";
    const listTagLc = listTag.toLowerCase();

    const blocks = blocksInRange(range);
    if (!blocks.length) {
      return;
    }

    const allInList = blocks.every(b => b.tagName === listTag);
    let lastInserted = null;

    blocks.forEach(block => {
      if (allInList) {
        // Unwrap each <li> back into a <p>.
        const frag = document.createDocumentFragment();
        Array.from(block.querySelectorAll("li")).forEach(li => {
          const p = document.createElement("p");
          p.innerHTML = li.innerHTML || "<br>";
          frag.appendChild(p);
          lastInserted = p;
        });
        block.replaceWith(frag);
      } else if (block.tagName === otherTag) {
        // Convert OL ↔ UL by swapping the wrapper element.
        const newList = document.createElement(listTagLc);
        newList.innerHTML = block.innerHTML;
        block.replaceWith(newList);
        lastInserted = newList.querySelector("li") || newList;
      } else if (block.tagName === "LI" || block.closest?.("ul,ol")) {
        // Selection landed inside a list — convert the parent list.
        const parentList = block.closest("ul,ol");
        if (parentList && parentList.tagName !== listTag) {
          const newList = document.createElement(listTagLc);
          newList.innerHTML = parentList.innerHTML;
          parentList.replaceWith(newList);
          lastInserted = newList.querySelector("li") || newList;
        }
      } else {
        // Plain block → wrap in a single-item list.
        const list = document.createElement(listTagLc);
        const li = document.createElement("li");
        li.innerHTML = block.innerHTML || "<br>";
        list.appendChild(li);
        block.replaceWith(list);
        lastInserted = li;
      }
    });

    if (lastInserted) {
      collapseSelectionToEndOf(lastInserted);
    }
    activeEditor()?.focus();
    rebalance();
    onContentChange(combinedHTML());
    updateCounts();
  };

  const toggleBlockquote = () => {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      return;
    }
    const range = sel.getRangeAt(0);
    const blocks = blocksInRange(range);
    if (!blocks.length) {
      return;
    }

    const allBQ = blocks.every(b => b.tagName === "BLOCKQUOTE");
    let lastInserted = null;
    blocks.forEach(block => {
      const wrapperTag = allBQ ? "p" : "blockquote";
      const el = document.createElement(wrapperTag);
      el.innerHTML = block.innerHTML || "<br>";
      block.replaceWith(el);
      lastInserted = el;
    });
    if (lastInserted) {
      collapseSelectionToEndOf(lastInserted);
    }
    activeEditor()?.focus();
    rebalance();
    onContentChange(combinedHTML());
  };

  // Replace each block-level ancestor of the selection with the chosen tag.
  // Falls back to native formatBlock when no blocks were resolved.
  const applyBlockType = type => {
    restoreSelection();
    const tagMap = { p: "p", h1: "h1", h2: "h2", h3: "h3", code: "pre" };
    const newTag = tagMap[type] || "p";
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      return;
    }
    const range = sel.getRangeAt(0);
    const blocks = blocksInRange(range);
    if (!blocks.length) {
      execCmd("formatBlock", newTag);
      return;
    }
    blocks.forEach(block => {
      const el = document.createElement(newTag);
      el.innerHTML = block.innerHTML || "<br>";
      block.replaceWith(el);
    });
    rebalance();
    onContentChange(combinedHTML());
  };

  // Collapse the current selection to the end of `node` and remember it.
  const collapseSelectionToEndOf = node => {
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    savedSelection.current = range.cloneRange();
  };

  // ── Link insertion ────────────────────────────────────────────────────────

  const openLinkModal = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      linkRangeRef.current = sel.getRangeAt(0).cloneRange();
    } else if (savedSelection.current) {
      linkRangeRef.current = savedSelection.current.cloneRange();
    }
    setLinkUrl("");
    setLinkModalOpen(true);
    // Defer the focus so React has actually mounted the input.
    setTimeout(() => {
      linkInputRef.current?.focus();
    }, 50);
  };

  const confirmLink = () => {
    const url = linkUrl.trim();
    if (!url) {
      setLinkModalOpen(false);
      return;
    }
    // Auto-prefix bare URLs so "example.com" still produces a working link.
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    activeEditor()?.focus();
    const sel = window.getSelection();
    if (sel && linkRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(linkRangeRef.current);
      if (sel.isCollapsed) {
        // Empty selection: insert the URL as both text and href.
        document.execCommand("insertHTML", false, `<a href="${fullUrl}">${fullUrl}</a>`);
      } else {
        // Wrap the selection in an anchor.
        document.execCommand("createLink", false, fullUrl);
      }
    }
    setLinkModalOpen(false);
    setLinkUrl("");
    rebalance();
    onContentChange(combinedHTML());
  };

  // ── Toolbar wiring ────────────────────────────────────────────────────────

  // Dispatch a toolbar action by id. Recreated each render so closures see
  // the latest state (pageCount, etc.); ref below keeps the registered
  // handler pointing at the latest version.
  const dispatchAction = (id, val) => {
    if (id === "bold") {
      execCmd("bold");
    } else if (id === "italic") {
      execCmd("italic");
    } else if (id === "underline") {
      execCmd("underline");
    } else if (id === "alignL") {
      execCmd("justifyLeft");
    } else if (id === "alignC") {
      execCmd("justifyCenter");
    } else if (id === "alignR") {
      execCmd("justifyRight");
    } else if (id === "ul") {
      toggleList("UL");
    } else if (id === "ol") {
      toggleList("OL");
    } else if (id === "bq") {
      toggleBlockquote();
    } else if (id === "link") {
      openLinkModal();
    } else if (id === "img") {
      const url = window.prompt("Image URL:");
      if (url) {
        execCmd("insertImage", url);
      }
    } else if (id === "tbl") {
      const tableHTML =
        "<table><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>" +
        "<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>" +
        "<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></table><p><br></p>";
      execCmd("insertHTML", tableHTML);
    } else if (id === "style") {
      applyBlockType(val);
    }
    rebalance();
    onContentChange(combinedHTML());
  };
  const dispatchActionRef = useRef(dispatchAction);
  dispatchActionRef.current = dispatchAction;

  useEffect(() => {
    registerActions((id, val) => dispatchActionRef.current?.(id, val));
  }, []); // eslint-disable-line

  // ── Input + key handling ──────────────────────────────────────────────────

  const handleInput = () => {
    rebalance();
    updateCounts();
    onContentChange(combinedHTML());
  };

  // Each page is its own contentEditable, so the browser won't move the caret
  // across page boundaries on its own. Detect when the caret is on the first/
  // last visual line (or at the very start/end) of the active page and hop to
  // the neighbouring page, preserving the horizontal cursor column.
  const caretRect = range => {
    const rects = range.getClientRects();
    if (rects.length > 0 && rects[0].height > 0) {
      return rects[0];
    }
    // Collapsed range inside an empty block returns no rects — fall back to
    // a probe span so we still get a usable rect.
    const probe = document.createElement("span");
    probe.appendChild(document.createTextNode("​"));
    range.insertNode(probe);
    const rect = probe.getBoundingClientRect();
    probe.parentNode.removeChild(probe);
    return rect;
  };

  const placeCaretAtPoint = (editor, x, y) => {
    let r = null;
    if (document.caretRangeFromPoint) {
      r = document.caretRangeFromPoint(x, y);
    } else if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      if (pos) {
        r = document.createRange();
        r.setStart(pos.offsetNode, pos.offset);
        r.collapse(true);
      }
    }
    if (!r || !editor.contains(r.startContainer)) {
      // Fallback: collapse to end (down→top of next page is rare to miss; up
      // hitting prev page bottom is the common case).
      r = document.createRange();
      r.selectNodeContents(editor);
      r.collapse(false);
    }
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  };

  const tryCrossPageArrow = e => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
      return false;
    }
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !sel.isCollapsed) {
      return false;
    }
    const idx = activePageIdx.current;
    const editor = pageRefs.current[idx];
    if (!editor || !editor.contains(sel.anchorNode)) {
      return false;
    }
    const range = sel.getRangeAt(0);

    if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      const prev = pageRefs.current[idx - 1];
      if (!prev) {
        return false;
      }

      if (e.key === "ArrowLeft") {
        // Only hop when caret is at the absolute start of the editor.
        const probe = document.createRange();
        probe.selectNodeContents(editor);
        probe.setEnd(range.startContainer, range.startOffset);
        if (probe.toString().length > 0) {
          return false;
        }
        e.preventDefault();
        prev.focus();
        activePageIdx.current = idx - 1;
        const r = document.createRange();
        r.selectNodeContents(prev);
        r.collapse(false);
        sel.removeAllRanges();
        sel.addRange(r);
        return true;
      }

      // ArrowUp: only hop when caret is on the editor's first visual line.
      const cRect = caretRect(range);
      const eRect = editor.getBoundingClientRect();
      if (cRect.top - eRect.top > cRect.height * 0.6) {
        return false;
      }
      e.preventDefault();
      prev.focus();
      activePageIdx.current = idx - 1;
      const prevRect = prev.getBoundingClientRect();
      // Aim for the same x, just above the bottom edge of the previous page.
      placeCaretAtPoint(prev, cRect.left, prevRect.bottom - Math.max(cRect.height, 8));
      return true;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      const next = pageRefs.current[idx + 1];
      if (!next) {
        return false;
      }

      if (e.key === "ArrowRight") {
        const probe = document.createRange();
        probe.selectNodeContents(editor);
        probe.setStart(range.startContainer, range.startOffset);
        if (probe.toString().length > 0) {
          return false;
        }
        e.preventDefault();
        next.focus();
        activePageIdx.current = idx + 1;
        const r = document.createRange();
        r.selectNodeContents(next);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
        return true;
      }

      // ArrowDown: hop when caret is on the editor's last visual line.
      const cRect = caretRect(range);
      const eRect = editor.getBoundingClientRect();
      if (eRect.bottom - cRect.bottom > cRect.height * 0.6) {
        return false;
      }
      e.preventDefault();
      next.focus();
      activePageIdx.current = idx + 1;
      const nextRect = next.getBoundingClientRect();
      placeCaretAtPoint(next, cRect.left, nextRect.top + Math.max(cRect.height, 8) * 0.5);
      return true;
    }

    return false;
  };

  const handleKeyDown = e => {
    if (
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight"
    ) {
      if (tryCrossPageArrow(e)) {
        return;
      }
    }
    if (e.metaKey || e.ctrlKey) {
      if (e.key === "b") {
        e.preventDefault();
        execCmd("bold");
        return;
      }
      if (e.key === "i") {
        e.preventDefault();
        execCmd("italic");
        return;
      }
      if (e.key === "u") {
        e.preventDefault();
        execCmd("underline");
        return;
      }
      if (e.key === "k") {
        e.preventDefault();
        openLinkModal();
        return;
      }
    }
    if (e.key === "Tab") {
      e.preventDefault();
      // Inside a list, Tab/Shift+Tab adjusts nesting level.
      // Outside, insert four non-breaking spaces (visible indent).
      if (nearestAncestor(["LI"])) {
        if (e.shiftKey) {
          execCmd("outdent");
        } else {
          execCmd("indent");
        }
      } else {
        restoreSelection();
        document.execCommand("insertHTML", false, "&nbsp;&nbsp;&nbsp;&nbsp;");
      }
    }
    if (e.key === "Escape" && linkModalOpen) {
      setLinkModalOpen(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden", minHeight: 0 }}>
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: "auto",
          background: canvasBackground,
          position: "relative",
          minWidth: 0,
        }}
      >
      {/* Inner track grows with the page so horizontal scroll reveals the full
          width on narrow viewports; min-width:100% keeps it centered when the
          viewport is wider than the page. */}
      <div
        style={{
          minWidth: "100%",
          width: "fit-content",
          padding: "40px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
        }}
      >
      {Array.from({ length: pageCount }).map((_, i) => (
        <Page
          key={i}
          ref={el => {
            pageRefs.current[i] = el;
          }}
          theme={theme}
          paperWidth={paperWidth}
          paddingTop={padTop}
          paddingBottom={padBottom}
          paddingHorizontal={padHorizontal}
          contentHeight={contentHeight}
          paperBackground={paperBackground}
          isDark={theme.dk}
          isLast={i === pageCount - 1}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => handleFocus(i)}
        />
      ))}
      </div>

      {/* Floating doc stats — non-interactive overlay, fixed to viewport. */}
      <div
        style={{
          position: "fixed",
          bottom: 36,
          right: 20,
          background: theme.el,
          border: `1px solid ${theme.bd}`,
          borderRadius: theme.rF,
          padding: "3px 10px",
          fontSize: 10,
          color: theme.tm,
          pointerEvents: "none",
        }}
      >
        {wordCount} words · {charCount} chars · {pageCount} page{pageCount !== 1 ? "s" : ""}
      </div>

      {linkModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 800,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: 120,
          }}
          onClick={e => {
            // Click on backdrop closes the modal; clicks inside don't bubble here.
            if (e.target === e.currentTarget) {
              setLinkModalOpen(false);
            }
          }}
        >
          <div
            style={{
              background: theme.el,
              border: `1px solid ${theme.bs}`,
              borderRadius: theme.r14,
              padding: "16px 18px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
              width: 360,
              animation: "popIn 0.15s ease",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: theme.tx, marginBottom: 10 }}>
              Insert link
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <input
                ref={linkInputRef}
                className="ninput"
                style={{ flex: 1, fontSize: 13 }}
                placeholder="https://example.com"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmLink();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setLinkModalOpen(false);
                  }
                }}
              />
              <button
                className="nb np"
                style={{ fontSize: 12, padding: "6px 14px", flexShrink: 0 }}
                onClick={confirmLink}
              >
                Insert
              </button>
              <button
                className="nb ng"
                style={{ fontSize: 12, padding: "6px 10px", flexShrink: 0 }}
                onClick={() => setLinkModalOpen(false)}
              >
                <I.X size={13} />
              </button>
            </div>
            <div style={{ fontSize: 10, color: theme.tm, marginTop: 8 }}>
              ⌘K · Select text first to wrap it in the link, or leave cursor to insert a new link
            </div>
          </div>
        </div>
      )}
      </div>

      <AppsSidebar
        doc={doc}
        appColor={appColor}
        mobile={isMobile}
        defaultOpen={false}
        onBack={onBack}
        saveStatus={saveStatus}
        activeWS={activeWS}
        onTitleChange={onTitleChange}
      >
        {isMobile && (
          <>
            <MobileToolbarPanel
              appId="writer"
              appColor={appColor}
              onAction={(id, val) => dispatchActionRef.current?.(id, val)}
              title="Format"
              icon={I.TypeT}
            />
            <DefaultSections doc={doc} defaultOpen={false} />
          </>
        )}
      </AppsSidebar>
    </div>
  );
};
