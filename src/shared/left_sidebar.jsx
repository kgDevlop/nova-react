import React, { useState, useRef, useEffect } from "react";
import { I } from "./icons";
import { useT } from "./theme";
import { useOut } from "./hooks/system";
import { NovaLogo } from "./atoms";
import { LeftSidebarConstants } from "./_constants";

// ── Delete workspace confirm ──────────────────────────────────────────────
//
// Type-to-confirm modal — guards the destructive workspace deletion path.
// `txt === "Delete"` is required before the confirm button enables.
const DeleteWSConfirm = ({ ws, onCancel, onConfirm }) => {
  const theme = useT();
  const [txt, setTxt] = useState("");
  const ok = txt === "Delete";
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const docCount = ws.docs.length;
  const docLabel = `document${docCount !== 1 ? "s" : ""}`;

  return (
    <div
      className="novl"
      onClick={e => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="nmod" style={{ maxWidth: 420 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: theme.r10,
              background: "rgba(232,82,82,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <I.Trash size={16} color={theme.error} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: theme.text, marginBottom: 4 }}>
              Delete workspace?
            </h3>
            <p style={{ fontSize: 12, color: theme.textDim, lineHeight: 1.5 }}>
              <strong style={{ color: theme.text }}>{ws.name}</strong> and its {docCount} {docLabel} will be permanently removed.
            </p>
          </div>
        </div>

        <label style={{ fontSize: 11, color: theme.textDim, display: "block", marginBottom: 6 }}>
          Type <strong style={{ color: theme.text, fontFamily: "monospace" }}>Delete</strong> to confirm:
        </label>
        <input
          ref={ref}
          className="ninput"
          placeholder="Delete"
          value={txt}
          onChange={e => setTxt(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && ok) {
              onConfirm();
            }
            if (e.key === "Escape") {
              onCancel();
            }
          }}
          style={{ marginBottom: 16 }}
        />

        <div style={{ display: "flex", gap: 7, justifyContent: "flex-end" }}>
          <button className="nb ng" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="nb np"
            style={{
              background: ok ? theme.error : theme.border,
              color: "#fff",
              cursor: ok ? "pointer" : "not-allowed",
              opacity: ok ? 1 : 0.5,
            }}
            disabled={!ok}
            onClick={onConfirm}
          >
            <I.Trash size={12} /> Delete workspace
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Workspace switcher ────────────────────────────────────────────────────
//
// Compact dropdown for switching between workspaces. Each entry supports
// inline rename and delete. Outside-clicks close the menu — but we keep it
// open while the delete-confirm modal is showing so dismissing the modal
// doesn't blow away the list underneath.
const WSSwitcher = ({ ws, active, onSwitch, onNew, onRename, onDelete, collapsed }) => {
  const theme = useT();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState("");
  const [confirmWS, setConfirmWS] = useState(null);
  const ref = useRef(null);
  const editRef = useRef(null);

  useOut(ref, () => {
    if (!confirmWS) {
      setOpen(false);
    }
  });

  useEffect(() => {
    if (editId) {
      editRef.current?.focus();
    }
  }, [editId]);

  const startEdit = (workspace, e) => {
    e.stopPropagation();
    setEditId(workspace.id);
    setDraft(workspace.name);
  };

  const commitEdit = () => {
    onRename?.(editId, draft);
    setEditId(null);
  };

  const cancelEdit = () => {
    setEditId(null);
    setDraft("");
  };

  const activeDocCount = active.docs.length;
  const activeDocLabel = `document${activeDocCount !== 1 ? "s" : ""}`;

  return (
    <div ref={ref} style={{ position: "relative", margin: "0 2px 12px", userSelect: "none" }}>
      <div
        onClick={() => setOpen(v => !v)}
        onMouseEnter={e => {
          e.currentTarget.style.background = theme.surfaceShade;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = open ? theme.surfaceAlt : "transparent";
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 9px",
          borderRadius: theme.r10,
          cursor: "pointer",
          transition: theme.transition,
          background: open ? theme.surfaceAlt : "transparent",
          border: `1px solid ${open ? theme.borderStrong : "transparent"}`,
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: theme.r6,
            background: active.color + "25",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          {active.emoji}
        </div>
        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: theme.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {active.name}
              </div>
              <div style={{ fontSize: 9, color: theme.textMuted }}>
                {activeDocCount} {activeDocLabel}
              </div>
            </div>
            <I.ChevDown size={11} color={theme.textMuted} />
          </>
        )}
      </div>

      {open && (
        <div
          className="nmenu"
          style={{
            left: 0,
            right: 0,
            top: "calc(100% + 4px)",
            transformOrigin: "top left",
            zIndex: 500,
          }}
        >
          <div
            style={{
              padding: "5px 9px 3px",
              fontSize: 9,
              fontWeight: 700,
              color: theme.textMuted,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Workspaces
          </div>

          {ws.map(workspace => {
            const isEditing = editId === workspace.id;
            const isActive = workspace.id === active.id;
            return (
              <div
                key={workspace.id}
                className="nmi"
                style={{
                  color: isActive ? theme.text : theme.textDim,
                  background: isActive ? theme.surfaceAlt : "transparent",
                  gap: 6,
                }}
                onClick={() => {
                  if (!isEditing) {
                    onSwitch(workspace.id);
                    setOpen(false);
                  }
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: theme.r6,
                    background: workspace.color + "25",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    flexShrink: 0,
                  }}
                >
                  {workspace.emoji}
                </div>
                {isEditing ? (
                  <input
                    ref={editRef}
                    className="ninput"
                    style={{ flex: 1, fontSize: 12, padding: "3px 7px" }}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        commitEdit();
                      }
                      if (e.key === "Escape") {
                        cancelEdit();
                      }
                    }}
                    onBlur={commitEdit}
                  />
                ) : (
                  <>
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: 12,
                      }}
                    >
                      {workspace.name}
                    </span>
                    <button
                      className="nb ni"
                      style={{ padding: 3, opacity: 0.6 }}
                      title="Rename"
                      onClick={e => startEdit(workspace, e)}
                    >
                      <I.Pencil size={10} />
                    </button>
                    {ws.length > 1 && (
                      <button
                        className="nb ni"
                        style={{ padding: 3, opacity: 0.6, color: theme.error }}
                        title="Delete"
                        onClick={e => {
                          e.stopPropagation();
                          setConfirmWS(workspace);
                        }}
                      >
                        <I.Trash size={10} />
                      </button>
                    )}
                    {isActive && <I.Check size={11} color={theme.accent} />}
                  </>
                )}
              </div>
            );
          })}

          <div className="ndiv" />
          <div
            className="nmi"
            onClick={() => {
              onNew();
              setOpen(false);
            }}
          >
            <I.Plus size={12} /> New workspace
          </div>
        </div>
      )}

      {confirmWS && (
        <DeleteWSConfirm
          ws={confirmWS}
          onCancel={() => setConfirmWS(null)}
          onConfirm={() => {
            onDelete?.(confirmWS.id);
            setConfirmWS(null);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
};

// ── Desktop sidebar ───────────────────────────────────────────────────────
export const Sidebar = ({
  view,
  onNav,
  onNewDoc,
  collapsed,
  onToggle,
  ws,
  active,
  onSwitch,
  onNew,
  onRenameWS,
  onDeleteWS,
  onSettings,
  getAppColor,
  isBetaEnabled,
}) => {
  const theme = useT();
  const width = collapsed ? 56 : 214;

  return (
    <div
      style={{
        width,
        height: "100%",
        background: theme.surface,
        borderRight: `1px solid ${theme.border}`,
        display: "flex",
        flexDirection: "column",
        transition: `width ${theme.transition}`,
        overflow: "hidden",
        flexShrink: 0,
        padding: "10px 7px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: "3px 5px",
          marginBottom: 11,
        }}
      >
        <NovaLogo compact={collapsed} />
        {!collapsed && (
          <button className="nb ni" style={{ padding: 4 }} onClick={onToggle}>
            <I.ChevLeft size={12} />
          </button>
        )}
      </div>

      <WSSwitcher
        ws={ws}
        active={active}
        onSwitch={onSwitch}
        onNew={onNew}
        onRename={onRenameWS}
        onDelete={onDeleteWS}
        collapsed={collapsed}
      />

      <div style={{ marginBottom: 11, padding: "0 2px" }}>
        {collapsed ? (
          <button
            className="nb ni"
            onClick={() => onNewDoc()}
            title="New document"
            style={{
              width: "100%",
              padding: 8,
              background: theme.accentSoft,
              color: theme.accent,
              borderRadius: theme.r10,
            }}
          >
            <I.Plus size={15} />
          </button>
        ) : (
          <button className="nb np" style={{ width: "100%" }} onClick={() => onNewDoc()}>
            <I.Plus size={13} /> New document
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {LeftSidebarConstants.PRIMARY_NAV.map(({ viewId, label, Icon: NavIcon }) => (
          <div
            key={viewId}
            className={`nnav ${view === viewId ? "active" : ""}`}
            style={{
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "8px" : "7px 9px",
            }}
            title={collapsed ? label : undefined}
            onClick={() => onNav(viewId)}
          >
            <NavIcon size={14} />
            {!collapsed && <span style={{ fontSize: 12 }}>{label}</span>}
          </div>
        ))}

        {!collapsed ? (
          <div className="nsect">Apps</div>
        ) : (
          <div className="ndiv" style={{ margin: "8px 4px" }} />
        )}

        {LeftSidebarConstants.APPS.filter(app => app.status !== "beta" || isBetaEnabled?.(app.appId)).map(app => {
          const isActive = view === app.appId;
          const def = theme.appColorFor(app.appId);
          const c = getAppColor?.(active.id, app.appId, def) ?? def;
          return (
            <div
              key={app.appId}
              className={`nnav ${isActive ? "active" : ""}`}
              style={{
                justifyContent: collapsed ? "center" : "flex-start",
                padding: collapsed ? "8px" : "7px 9px",
                gap: collapsed ? 0 : 8,
              }}
              title={collapsed ? app.label : undefined}
              onClick={() => onNav(app.appId)}
            >
              <app.Icon size={14} color={isActive ? c : undefined} />
              {!collapsed && (
                <span style={{ fontSize: 12, color: isActive ? theme.text : undefined }}>
                  {app.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
        <div
          className="nnav"
          style={{
            justifyContent: collapsed ? "center" : "flex-start",
            padding: collapsed ? "8px" : "7px 9px",
          }}
          onClick={onSettings}
          title={collapsed ? "Settings" : undefined}
        >
          <I.Settings size={14} />
          {!collapsed && <span style={{ fontSize: 12 }}>Settings</span>}
        </div>
      </div>
    </div>
  );
};

// ── Mobile sidebar ────────────────────────────────────────────────────────
export const MobSidebar = ({
  onClose,
  view,
  onNav,
  onNewDoc,
  ws,
  active,
  onSwitch,
  onNew,
  onRenameWS,
  onDeleteWS,
  onSettings,
  getAppColor,
  isBetaEnabled,
}) => {
  const theme = useT();

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400 }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 264,
          background: theme.surface,
          borderLeft: `1px solid ${theme.border}`,
          padding: "12px 8px",
          display: "flex",
          flexDirection: "column",
          animation: "slideR 0.24s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 11,
            padding: "0 4px",
          }}
        >
          <NovaLogo />
          <button className="nb ni" onClick={onClose}>
            <I.X size={15} />
          </button>
        </div>

        <WSSwitcher
          ws={ws}
          active={active}
          onSwitch={id => {
            onSwitch(id);
            onClose();
          }}
          onNew={() => {
            onNew();
            onClose();
          }}
          onRename={onRenameWS}
          onDelete={onDeleteWS}
          collapsed={false}
        />

        <button
          className="nb np"
          style={{ width: "100%", marginBottom: 10 }}
          onClick={() => {
            onNewDoc();
            onClose();
          }}
        >
          <I.Plus size={13} /> New document
        </button>

        {LeftSidebarConstants.PRIMARY_NAV.map(({ viewId, label, Icon: NavIcon }) => (
          <div
            key={viewId}
            className={`nnav ${view === viewId ? "active" : ""}`}
            onClick={() => {
              onNav(viewId);
              onClose();
            }}
          >
            <NavIcon size={14} />
            <span style={{ fontSize: 12 }}>{label}</span>
          </div>
        ))}

        <div className="nsect">Apps</div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {LeftSidebarConstants.APPS.filter(app => app.status !== "beta" || isBetaEnabled?.(app.appId)).map(app => {
            const def = theme.appColorFor(app.appId);
            const c = getAppColor?.(active.id, app.appId, def) ?? def;
            return (
              <div
                key={app.appId}
                className={`nnav ${view === app.appId ? "active" : ""}`}
                onClick={() => {
                  onNav(app.appId);
                  onClose();
                }}
              >
                <app.Icon size={14} color={c} />
                <span style={{ fontSize: 12 }}>{app.label}</span>
              </div>
            );
          })}
        </div>

        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
          <div
            className="nnav"
            onClick={() => {
              onSettings?.();
              onClose();
            }}
          >
            <I.Settings size={14} />
            <span style={{ fontSize: 12 }}>Settings</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Mobile top bar ────────────────────────────────────────────────────────
// Hamburger sits on the right since the menu drawer slides in from the right
// (dominant-thumb reach). Back/forward live between the logo and the profile
// cluster, replacing the mobile TabBar.
export const MobTopBar = ({ onOpen, onSearchClick, onBack, onForward, canBack, canForward, workspace }) => {
  const theme = useT();

  const navBtnStyle = enabled => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    border: "none",
    background: "transparent",
    borderRadius: theme.r6,
    cursor: enabled ? "pointer" : "default",
    color: enabled ? theme.text : theme.textMuted,
    opacity: enabled ? 1 : 0.4,
    padding: 0,
    transition: theme.transition,
    flexShrink: 0,
  });

  return (
    <div
      style={{
        height: 50,
        background: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
        display: "flex",
        alignItems: "center",
        padding: "0 10px",
        gap: 6,
        flexShrink: 0,
      }}
    >
      <NovaLogo workspace={workspace} />
      {onSearchClick && (
        <button className="nb ni" onClick={onSearchClick} title="Search">
          <I.Search size={15} />
        </button>
      )}
      <div style={{ flex: 1 }} />
      <button
        type="button"
        title="Back"
        disabled={!canBack}
        onClick={onBack}
        style={navBtnStyle(!!canBack)}
      >
        <I.ArrowL size={14} />
      </button>
      <button
        type="button"
        title="Forward"
        disabled={!canForward}
        onClick={onForward}
        style={navBtnStyle(!!canForward)}
      >
        <I.ArrowR size={14} />
      </button>
      <button className="nb ni" onClick={onOpen} title="Menu">
        <I.Menu size={17} />
      </button>
    </div>
  );
};
