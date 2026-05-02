import React, { useState, useEffect, useRef } from "react";
import { I } from "./icons";
import { useT } from "./theme";
import { AppChip } from "./atoms";
import { apps_sidebar as apps_sidebarConst, toolbar as toolbarConst } from "./_constants";

export const AppsSidebarSection = ({ title, icon: Ico, children, defaultOpen = true }) => {
  const t = useT();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${t.bd}` }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 12px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: t.tx,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {Ico && <Ico size={12} color={t.tm} />}
        <span style={{ flex: 1, textAlign: "left" }}>{title}</span>
        <I.ChevDown
          size={11}
          color={t.tm}
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: t.tr }}
        />
      </button>
      {open && <div style={{ padding: "2px 12px 12px" }}>{children}</div>}
    </div>
  );
};

export const DefaultSections = ({ doc, defaultOpen = true }) => {
  const t = useT();
  const modified = doc?.modified ? new Date(doc.modified).toLocaleString() : "—";
  const created = doc?.created ? new Date(doc.created).toLocaleString() : "—";
  const row = (k, v) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11, padding: "3px 0" }}>
      <span style={{ color: t.tm }}>{k}</span>
      <span style={{ color: t.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
    </div>
  );
  return (
    <>
      <AppsSidebarSection title="Document" icon={I.FileText} defaultOpen={defaultOpen}>
        {row("Type", doc?.type || "—")}
        {row("Created", created)}
        {row("Modified", modified)}
      </AppsSidebarSection>
      <AppsSidebarSection title="Activity" icon={I.Clock} defaultOpen={false}>
        <div style={{ fontSize: 11, color: t.tm, lineHeight: 1.5 }}>No recent activity.</div>
      </AppsSidebarSection>
      <AppsSidebarSection title="Comments" icon={I.Bell} defaultOpen={false}>
        <div style={{ fontSize: 11, color: t.tm, lineHeight: 1.5 }}>No comments yet.</div>
      </AppsSidebarSection>
    </>
  );
};

// ── Mobile topbar header ────────────────────────────────────────────────────
// Replaces the desktop AppTopBar when AppsSidebar is rendered as a mobile
// drawer. Hosts the app chip, inline title editing, save indicator, and a
// close-panel button. Back navigation lives in the desktop top bar only.
const MobileTopHeader = ({ doc, appColor, saveStatus, activeWS, onTitleChange, onClose }) => {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(doc?.title || "");
  const inputRef = useRef(null);

  const isSingleton = doc?.type === "calendar";
  const displayTitle = isSingleton
    ? `Calendar — ${activeWS?.name || ""}`
    : doc?.title || "Untitled";

  useEffect(() => {
    setTitle(doc?.title || "");
  }, [doc?.title]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  const commit = () => {
    if (title.trim() && title !== doc?.title) {
      onTitleChange?.(title.trim());
    }
    setEditing(false);
  };

  const saveLabel = { saving: "Saving…", saved: "Saved ✓" }[saveStatus] || "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "10px 10px 10px",
        borderBottom: `1px solid ${t.bd}`,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <AppChip appId={doc?.type} size={26} colorOverride={appColor} />
        <div style={{ flex: 1 }} />
        {saveLabel && (
          <span style={{ fontSize: 10, color: t.ac, flexShrink: 0 }}>
            {saveLabel}
          </span>
        )}
        <button className="nb ni" onClick={onClose} title="Close panel">
          <I.X size={14} />
        </button>
      </div>
      {editing && !isSingleton ? (
        <input
          ref={inputRef}
          className="ninput"
          style={{ fontSize: 13, fontWeight: 700, padding: "5px 8px" }}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === "Enter") {
              commit();
            }
            if (e.key === "Escape") {
              setTitle(doc?.title || "");
              setEditing(false);
            }
          }}
        />
      ) : (
        <span
          onClick={() => { if (!isSingleton) setEditing(true); }}
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: t.tx,
            cursor: isSingleton ? "default" : "text",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            padding: "2px 4px",
          }}
        >
          {displayTitle}
        </span>
      )}
    </div>
  );
};

// ── Mobile drawer ───────────────────────────────────────────────────────────
// Right-side overlay that subsumes the inline AppsSidebar. An ellipsis
// menu button anchored to the viewport opens it.
const MobileAppsSidebar = ({ doc, appColor, children, saveStatus, activeWS, onTitleChange }) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  // FAB position in viewport coords. Initial spot mirrors the previous static
  // top-right placement (right:12, top:64).
  const FAB_SIZE = 38;
  const DRAG_THRESHOLD = 5;
  const [pos, setPos] = useState(() => ({
    x: Math.max(8, (typeof window !== "undefined" ? window.innerWidth : 400) - FAB_SIZE - 12),
    y: 64,
  }));

  // Pointerdown attaches document-level move/up listeners so the drag tracks
  // even when the cursor leaves the button. Tap vs drag is decided at pointerup
  // by whether motion crossed DRAG_THRESHOLD.
  const onPointerDown = e => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;
    let moved = false;

    const onMove = me => {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      if (!moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
        moved = true;
      }
      if (moved) {
        const nx = Math.max(0, Math.min(window.innerWidth - FAB_SIZE, me.clientX - offsetX));
        const ny = Math.max(0, Math.min(window.innerHeight - FAB_SIZE, me.clientY - offsetY));
        setPos({ x: nx, y: ny });
      }
    };

    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      if (!moved) {
        setOpen(true);
      }
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  };

  return (
    <>
      <button
        type="button"
        title="Open menu · drag to move"
        onPointerDown={onPointerDown}
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          width: FAB_SIZE,
          height: FAB_SIZE,
          background: t.surface,
          border: `1px solid ${t.bd}`,
          borderRadius: "50%",
          color: appColor || t.tx,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "grab",
          padding: 0,
          zIndex: 200,
          boxShadow: `0 4px 14px rgba(0,0,0,0.18)`,
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <I.Dots size={18} />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 400,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: "min(320px, 88vw)",
              background: t.surface,
              borderLeft: `1px solid ${t.bd}`,
              display: "flex",
              flexDirection: "column",
              animation: "slideR 0.24s ease",
            }}
          >
            <MobileTopHeader
              doc={doc}
              appColor={appColor}
              saveStatus={saveStatus}
              activeWS={activeWS}
              onTitleChange={onTitleChange}
              onClose={() => setOpen(false)}
            />
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              {children || <DefaultSections doc={doc} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ── Mobile toolbar panel ────────────────────────────────────────────────────
// Renders an app's TOOLBARS config as grouped buttons inside an
// AppsSidebarSection so toolbar actions are reachable from the mobile drawer.
// Items are grouped by `sep` boundaries; spacers/labels are skipped.
export const MobileToolbarPanel = ({
  appId,
  appColor,
  onAction,
  title = "Format",
  icon,
  items,
}) => {
  const t = useT();
  const cfg = items || toolbarConst.TOOLBARS[appId] || [];

  const groups = [];
  let cur = [];
  for (const it of cfg) {
    if (it.type === "sep") {
      if (cur.length) {
        groups.push(cur);
        cur = [];
      }
    } else if (it.type === "spacer" || it.type === "label") {
      // No vertical equivalent inside the drawer — skip.
    } else {
      cur.push(it);
    }
  }
  if (cur.length) {
    groups.push(cur);
  }

  const renderItem = item => {
    if (item.type === "dd") {
      return (
        <select
          key={item.id}
          onChange={e => onAction?.(item.id, e.target.value)}
          defaultValue={item.opts?.[0]?.v}
          style={{
            flex: 1,
            minWidth: 0,
            background: t.surface,
            border: `1px solid ${t.bd}`,
            color: t.tx,
            fontSize: 12,
            fontFamily: t.fn,
            borderRadius: t.r6,
            padding: "6px 13px 6px 8px",
            outline: "none",
          }}
        >
          {item.opts?.map(o => (
            <option key={o.v} value={o.v}>{o.l}</option>
          ))}
        </select>
      );
    }
    if (item.type === "btn") {
      const Icon = item.Icon;
      const isText = !Icon && item.label;
      return (
        <button
          key={item.id}
          title={item.label}
          onClick={() => onAction?.(item.id)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: isText ? undefined : 36,
            height: 36,
            padding: isText ? "0 12px" : 0,
            borderRadius: t.r6,
            border: `1px solid ${t.bd}`,
            background: t.surface,
            color: appColor || t.tx,
            cursor: "pointer",
            flexShrink: 0,
            fontFamily: t.fn,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {Icon ? <Icon size={15} /> : item.label}
        </button>
      );
    }
    return null;
  };

  return (
    <AppsSidebarSection title={title} icon={icon}>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {groups.map((g, gi) => (
          <div key={gi} style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {g.map(renderItem)}
          </div>
        ))}
      </div>
    </AppsSidebarSection>
  );
};

export const AppsSidebar = ({ doc, appColor, defaultOpen, children, mobile, onBack, saveStatus, activeWS, onTitleChange }) => {
  const t = useT();
  const [open, setOpen] = useState(defaultOpen ?? Boolean(children));

  if (mobile) {
    return (
      <MobileAppsSidebar
        doc={doc}
        appColor={appColor}
        saveStatus={saveStatus}
        activeWS={activeWS}
        onTitleChange={onTitleChange}
      >
        {children}
      </MobileAppsSidebar>
    );
  }

  const W = open ? apps_sidebarConst.OPEN_W : apps_sidebarConst.CLOSED_W;

  return (
    <div
      style={{
        width: W,
        height: "100%",
        background: t.surface,
        borderLeft: `1px solid ${t.bd}`,
        display: "flex",
        flexDirection: "column",
        transition: `width ${t.tr}`,
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 36,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: open ? "0 8px 0 12px" : 0,
          justifyContent: open ? "space-between" : "center",
          borderBottom: `1px solid ${t.bd}`,
          flexShrink: 0,
        }}
      >
        {open && (
          <span style={{ fontSize: 11, fontWeight: 700, color: t.tx, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Panel
          </span>
        )}
        <button
          className="nb ni"
          onClick={() => setOpen(v => !v)}
          title={open ? "Collapse panel" : "Expand panel"}
          style={{ padding: 5, color: appColor || t.tm }}
        >
          {open ? <I.ChevRight size={13} /> : <I.ChevLeft size={13} />}
        </button>
      </div>
      {open && (
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {children || <DefaultSections doc={doc} />}
        </div>
      )}
    </div>
  );
};
