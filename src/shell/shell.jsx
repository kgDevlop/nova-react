import React, { useState, useRef, useCallback } from "react";
import { I } from "../shared/icons";
import { useT } from "../shared/theme";
import { useAutoSave } from "../shared/hooks/store";
import { AppTopBar, StatusBar } from "../shared/topbar";
import { ToolbarRow } from "../shared/toolbar";
import { AppsSidebar } from "../shared/apps_sidebar";
import { _app } from "./registry";
import { WriterEditor } from "../apps/writer";
import { SheetsEditor } from "../apps/spreads";
import { SlidesEditor } from "../apps/slides";
import { DrawEditor } from "../apps/draw";
import { CalendarEditor } from "../apps/calendar";
import { ListEditor } from "../apps/list";

// ── Editor registry ─────────────────────────────────────────────────────────
// Maps each app id to the React component that renders its main canvas.
const CANVASES = {
  writer: WriterEditor,
  sheets: SheetsEditor,
  slides: SlidesEditor,
  draw: DrawEditor,
  calendar: CalendarEditor,
  list: ListEditor,
};

// Per-app status-bar hint shown in the bottom-left of the editor chrome.
const LEFT_HINTS = {
  writer: "Click to format · Toolbar above",
  sheets: "Click a cell · Double-click to edit · = for formula",
  slides: "Click element to select · Drag to move · Double-click to edit text",
  draw: "Select (V) · Rect (R) · Ellipse (E) · Line (L) · Text (T) · Pen (P)",
  calendar: "Click a day to add event · Click event to edit",
  list: "Tab to indent · Enter to add · Click checkbox to mark done",
};

// Editors that render their own right-side panel and should suppress the
// default AppsSidebar (e.g. calendar shows My Calendars + mini-month).
const OWNS_SIDEBAR = new Set(["calendar"]);

// ── Error boundary ──────────────────────────────────────────────────────────
// Editors call setErr explicitly — we never auto-catch render errors here so
// runtime issues in the editor surface naturally during development.
const ErrBoundary = ({ children, onBack }) => {
  const theme = useT();
  const [err, setErr] = useState(null); // eslint-disable-line no-unused-vars

  if (err) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
          padding: 32,
          background: theme.bg,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: theme.r14,
            background: "rgba(232,82,82,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <I.X size={22} color="#E85252" />
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: theme.tx }}>
          Something went wrong
        </div>
        <div
          style={{
            fontSize: 12,
            color: theme.ts,
            maxWidth: 380,
            textAlign: "center",
          }}
        >
          {err?.message}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="nb ng" onClick={() => setErr(null)}>
            Try again
          </button>
          <button
            className="nb ng"
            onClick={() => {
              setErr(null);
              onBack?.();
            }}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {children}
    </div>
  );
};

// ── App shell ───────────────────────────────────────────────────────────────

export const AppShell = ({ doc, onBack, getAppColor, activeWS, updateDoc }) => {
  const theme = useT();
  const def = _app(doc.type);
  const appColor = doc.appColor || getAppColor(activeWS.id, doc.type, def.dc);

  const [content, setContent] = useState(doc.content || "");
  const saveStatus = useAutoSave(doc.id, content, updateDoc);

  // Editors call registerActions(fn) on mount; we route toolbar clicks here.
  const actionsRef = useRef(null);

  const Canvas = CANVASES[doc.type];
  const isRealEditor = true; // all 14 apps are now real editors
  const showZoom = doc.type === "draw";
  const leftText = LEFT_HINTS[doc.type] || "";
  const ownsSidebar = OWNS_SIDEBAR.has(doc.type);

  const handleAction = useCallback((id, val) => {
    actionsRef.current?.(id, val);
  }, []);

  const registerActions = useCallback(fn => {
    actionsRef.current = fn;
  }, []);

  return (
    <ErrBoundary onBack={onBack}>
      <AppTopBar
        doc={doc}
        onBack={onBack}
        appColor={appColor}
        saveStatus={saveStatus}
        activeWS={activeWS}
        onTitleChange={title => {
          updateDoc(doc.id, { title });
        }}
      />
      <ToolbarRow
        appId={doc.type}
        onAction={handleAction}
        appColor={appColor}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden", minHeight: 0 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          {Canvas && (
            isRealEditor ? (
              <Canvas
                appColor={appColor}
                doc={doc}
                t={theme}
                onContentChange={setContent}
                registerActions={registerActions}
              />
            ) : (
              <Canvas appColor={appColor} t={theme} />
            )
          )}
        </div>
        {!ownsSidebar && <AppsSidebar doc={doc} appColor={appColor} />}
      </div>
      <StatusBar
        leftText={leftText}
        saveStatus={saveStatus}
        showZoom={showZoom}
      />
    </ErrBoundary>
  );
};
