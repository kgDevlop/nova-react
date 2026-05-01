import React, { useState, useCallback, useContext, createContext } from "react";
import { I } from "./icons";
import { useT } from "./theme";
import { utils } from "./_utils";

// ── Notification context ──────────────────────────────────────────────────

export const NotifCtx = createContext({ notify: () => {} });
export const useNotify = () => useContext(NotifCtx).notify;

// ── Toast presentation ────────────────────────────────────────────────────

const ToastStack = ({ toasts, onDismiss }) => {
  const theme = useT();

  // Per-type styling: bg/border/icon/icon-color.
  const toastStyles = {
    success: {
      bg: theme.dk ? "#1a3a2a" : "#e8f5ee",
      border: "#3BB580",
      ic: "✓",
      c: "#3BB580",
    },
    error: {
      bg: theme.dk ? "#3a1a1a" : "#fde8e8",
      border: "#E85252",
      ic: "✕",
      c: "#E85252",
    },
    warning: {
      bg: theme.dk ? "#3a2e1a" : "#fef3e2",
      border: "#F59E0B",
      ic: "⚠",
      c: "#F59E0B",
    },
    info: {
      bg: theme.el,
      border: theme.bs,
      ic: "ℹ",
      c: theme.ts,
    },
  };

  if (!toasts.length) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9000,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map(toast => {
        const s = toastStyles[toast.type] || toastStyles.info;
        return (
          <div
            key={toast.id}
            onClick={() => onDismiss(toast.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: s.bg,
              border: `1px solid ${s.border}`,
              borderRadius: theme.r10,
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              animation: "fadeUp 0.2s ease",
              maxWidth: 340,
              pointerEvents: "all",
              cursor: "pointer",
              minWidth: 220,
            }}
          >
            <span style={{ fontSize: 13, color: s.c, flexShrink: 0, fontWeight: 700 }}>
              {s.ic}
            </span>
            <span style={{ fontSize: 12, color: theme.tx, lineHeight: 1.4, flex: 1 }}>
              {toast.msg}
            </span>
            <I.X size={11} color={theme.tm} />
          </div>
        );
      })}
    </div>
  );
};

// ── Provider ──────────────────────────────────────────────────────────────

export function NotifProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((type, msg, duration = 3500) => {
    const id = utils._uid();
    setToasts(prev => [...prev, { id, type, msg }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== id));
    }, duration);
  }, []);

  return (
    <NotifCtx.Provider value={{ notify }}>
      {children}
      <ToastStack
        toasts={toasts}
        onDismiss={id => setToasts(prev => prev.filter(x => x.id !== id))}
      />
    </NotifCtx.Provider>
  );
}
