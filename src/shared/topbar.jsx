import React, { useState, useEffect, useRef } from "react";
import { useT } from "./theme";
import { AppChip } from "./atoms";

// ── App top bar (title, save status) ──────────────────────────────────────

export const AppTopBar = ({ doc, appColor, saveStatus, activeWS, onTitleChange }) => {
  const theme = useT();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(doc?.title || "");
  const inputRef = useRef(null);

  // Calendar is a workspace-wide singleton — its title is rendered from the
  // workspace name and isn't user-editable.
  const isSingleton = doc?.type === "calendar";
  const displayTitle = isSingleton
    ? `Calendar — ${activeWS?.name || ""}`
    : doc?.title || "Untitled";

  // Sync local title state when the document switches.
  useEffect(() => {
    setTitle(doc?.title || "");
  }, [doc?.title]);

  // Auto-focus the title input when entering edit mode.
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
        height: 44,
        background: theme.surface,
        borderBottom: `1px solid ${theme.bd}`,
        display: "flex",
        alignItems: "center",
        padding: "0 10px",
        gap: 8,
        flexShrink: 0,
      }}
    >
      <AppChip appId={doc?.type} size={26} colorOverride={appColor} />

      {editing && !isSingleton ? (
        <input
          ref={inputRef}
          className="ninput"
          style={{ fontSize: 13, fontWeight: 700, padding: "3px 8px", flex: 1, maxWidth: 400 }}
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
          title={isSingleton ? "This calendar's name follows the workspace" : undefined}
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: theme.tx,
            flex: 1,
            cursor: isSingleton ? "default" : "text",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 400,
          }}
        >
          {displayTitle}
        </span>
      )}

      <div style={{ flex: 1 }} />

      {saveLabel && (
        <span
          style={{
            fontSize: 11,
            color: theme.ac,
            minWidth: 52,
            textAlign: "right",
            flexShrink: 0,
          }}
        >
          {saveLabel}
        </span>
      )}
    </div>
  );
};

