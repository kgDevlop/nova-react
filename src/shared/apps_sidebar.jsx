import React, { useState } from "react";
import { I } from "./icons";
import { useT } from "./theme";
import { apps_sidebar as C } from "./_constants";

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

export const AppsSidebar = ({ doc, appColor, defaultOpen, children }) => {
  const t = useT();
  const [open, setOpen] = useState(defaultOpen ?? Boolean(children));
  const W = open ? C.OPEN_W : C.CLOSED_W;

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
