import React, { useState, useRef, useCallback } from "react";
import { I } from "../shared/icons";
import { useT } from "../shared/theme";
import { useAutoSave } from "../shared/hooks/store";
import { AppTopBar } from "../shared/topbar";
import { ToolbarRow } from "../shared/toolbar";
import { AppsSidebar } from "../shared/apps_sidebar";
import { registry } from "../shared/_utils";
import { WriterEditor } from "../apps/writer";
import { SheetsEditor } from "../apps/spreads";
import { SlidesEditor } from "../apps/slides";
import { DrawEditor } from "../apps/draw";
import { CalendarEditor } from "../apps/calendar";
import { ListEditor } from "../apps/list";
import { shell as shellConst } from "../shared/_constants";

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

export const AppShell = ({ doc, onBack, getAppColor, activeWS, updateDoc, isMobile }) => {
  const theme = useT();
  const def = registry._app(doc.type);
  const appColor = getAppColor(activeWS.id, doc.type, theme.appColorFor(doc.type));

  const [content, setContent] = useState(doc.content || "");
  const saveStatus = useAutoSave(doc.id, content, updateDoc);

  // Editors call registerActions(fn) on mount; we route toolbar clicks here.
  const actionsRef = useRef(null);

  const Canvas = CANVASES[doc.type];
  const isRealEditor = true; // all 14 apps are now real editors
  const ownsSidebar = shellConst.OWNS_SIDEBAR.has(doc.type);
  const hideToolbar = isMobile && shellConst.MOBILE_OWNS_TOOLBAR.has(doc.type);

  const handleAction = useCallback((id, val) => {
    actionsRef.current?.(id, val);
  }, []);

  const registerActions = useCallback(fn => {
    actionsRef.current = fn;
  }, []);

  const handleTitleChange = useCallback(title => {
    updateDoc(doc.id, { title });
  }, [doc.id, updateDoc]);

  return (
    <ErrBoundary onBack={onBack}>
      {!isMobile && (
        <AppTopBar
          doc={doc}
          appColor={appColor}
          saveStatus={saveStatus}
          activeWS={activeWS}
          onTitleChange={handleTitleChange}
        />
      )}
      {!hideToolbar && (
        <ToolbarRow
          appId={doc.type}
          onAction={handleAction}
          appColor={appColor}
        />
      )}
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
                isMobile={isMobile}
                onBack={onBack}
                saveStatus={saveStatus}
                activeWS={activeWS}
                onTitleChange={handleTitleChange}
              />
            ) : (
              <Canvas appColor={appColor} t={theme} />
            )
          )}
        </div>
        {!ownsSidebar && (
          <AppsSidebar
            doc={doc}
            appColor={appColor}
            mobile={isMobile}
            onBack={onBack}
            saveStatus={saveStatus}
            activeWS={activeWS}
            onTitleChange={handleTitleChange}
          />
        )}
      </div>
    </ErrBoundary>
  );
};
