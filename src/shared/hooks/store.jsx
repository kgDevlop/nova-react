import { useState, useCallback, useEffect, useRef } from "react";
import { _uid, _autoName, _uniqueTitle } from "../utils";

const STORAGE_KEY = "nova:workspaces:v1";
const ACTIVE_KEY = "nova:active-ws:v1";

// Default workspace — a single empty workspace shown on first load.
const WS_SEEDS = [
  { id: "ws-default", name: "Nova", emoji: "💥", color: "#C8A253", docs: [] },
];

// ── Persistence ───────────────────────────────────────────────────────────
//
// localStorage round-trip. Dates serialise to strings, so revive them on load.
const _load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return WS_SEEDS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      return WS_SEEDS;
    }
    return parsed.map(w => ({
      ...w,
      docs: (w.docs || []).map(d => ({
        ...d,
        modified: d.modified ? new Date(d.modified) : new Date(),
      })),
    }));
  } catch {
    return WS_SEEDS;
  }
};

const _save = ws => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ws));
    return true;
  } catch {
    return false;
  }
};

const _loadActive = ws => {
  try {
    const id = localStorage.getItem(ACTIVE_KEY);
    if (id && ws.some(w => w.id === id)) {
      return id;
    }
  } catch {
    // Ignore — fall through to first workspace.
  }
  return ws[0]?.id;
};

// ── §6  STORE HOOKS ───────────────────────────────────────────────────────
export const useWSStore = () => {
  const [ws, setWS] = useState(_load);
  const [activeId, setActiveId] = useState(() => _loadActive(_load()));
  const active = ws.find(w => w.id === activeId) || ws[0];

  useEffect(() => {
    _save(ws);
  }, [ws]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_KEY, activeId || "");
    } catch {
      // Ignore quota/availability errors — active id will just not persist.
    }
  }, [activeId]);

  const createWS = useCallback((name, emoji, color) => {
    const w = {
      id: _uid(),
      name,
      emoji: emoji || "",
      color: color || "#C8A253",
      docs: [],
    };
    setWS(p => [...p, w]);
    setActiveId(w.id);
    return w;
  }, []);

  const renameWS = useCallback((id, name) => {
    if (!name?.trim()) {
      return;
    }
    setWS(p => p.map(w => {
      if (w.id !== id) {
        return w;
      }
      return { ...w, name: name.trim() };
    }));
  }, []);

  const deleteWS = useCallback(id => {
    setWS(p => {
      if (p.length <= 1) {
        return p;
      }
      const next = p.filter(w => w.id !== id);
      if (id === activeId) {
        setActiveId(next[0].id);
      }
      return next;
    });
  }, [activeId]);

  const createDoc = useCallback((type, title, appColor) => {
    const id = _uid();
    const desired = title || _autoName(type);
    let doc;
    setWS(p => {
      if (!p.length) {
        return p;
      }
      // Fall back to the first workspace if activeId is stale — mirrors the
      // `active` selector so we never silently no-op on a stale id.
      const targetIdx = Math.max(0, p.findIndex(w => w.id === activeId));
      return p.map((w, i) => {
        if (i !== targetIdx) {
          return w;
        }
        doc = {
          id,
          title: _uniqueTitle(w.docs, type, desired),
          type,
          modified: new Date(),
          starred: false,
          content: "",
          appColor,
        };
        return { ...w, docs: [doc, ...w.docs] };
      });
    });
    return doc;
  }, [activeId]);

  const updateDoc = useCallback((id, ch) => {
    let resolved = ch;
    setWS(p => p.map(w => {
      if (w.id !== activeId) {
        return w;
      }
      return {
        ...w,
        docs: w.docs.map(d => {
          if (d.id !== id) {
            return d;
          }
          const next = { ...d, ...ch, modified: new Date() };
          // Title changes need uniqueness enforcement against siblings.
          if (ch.title !== undefined && ch.title !== d.title) {
            next.title = _uniqueTitle(w.docs, d.type, ch.title, id);
            resolved = { ...ch, title: next.title };
          }
          return next;
        }),
      };
    }));
    return resolved;
  }, [activeId]);

  const deleteDoc = useCallback(id => {
    setWS(p => p.map(w => {
      if (w.id !== activeId) {
        return w;
      }
      return { ...w, docs: w.docs.filter(d => d.id !== id) };
    }));
  }, [activeId]);

  const toggleStar = useCallback(id => {
    setWS(p => p.map(w => {
      if (w.id !== activeId) {
        return w;
      }
      return {
        ...w,
        docs: w.docs.map(d => {
          if (d.id !== id) {
            return d;
          }
          return { ...d, starred: !d.starred };
        }),
      };
    }));
  }, [activeId]);

  const restoreWS = useCallback(snapshot => {
    if (Array.isArray(snapshot)) {
      setWS(snapshot);
    }
  }, []);

  return {
    ws,
    active,
    setActiveId,
    createWS,
    renameWS,
    deleteWS,
    createDoc,
    updateDoc,
    deleteDoc,
    toggleStar,
    restoreWS,
  };
};

// ── Auto-save ─────────────────────────────────────────────────────────────
//
// Debounces content writes by 800ms; surfaces a transient "saved" status
// for ~2.5s after the write lands so the UI can flash a confirmation.
export const useAutoSave = (docId, content, updateDoc) => {
  const [status, setStatus] = useState("idle");
  const timer = useRef(null);

  useEffect(() => {
    if (content == null) {
      return;
    }
    setStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      updateDoc(docId, { content });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    }, 800);
    return () => clearTimeout(timer.current);
  }, [content, docId]);

  return status;
};

// ── App color overrides ───────────────────────────────────────────────────
export const useAppColors = () => {
  const [ov, set] = useState({});
  const get = useCallback(
    (wsId, appId, def) => ov[`${wsId}:${appId}`] || def,
    [ov],
  );
  const put = useCallback(
    (wsId, appId, c) => set(p => ({ ...p, [`${wsId}:${appId}`]: c })),
    [],
  );
  return { get, put };
};

// ── Tab management ────────────────────────────────────────────────────────
export const useTabs = () => {
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);

  const openTab = useCallback(doc => {
    setTabs(prev => {
      if (prev.find(tab => tab.id === doc.id)) {
        return prev;
      }
      return [...prev, { ...doc }];
    });
    setActiveTabId(doc.id);
  }, []);

  const closeTab = useCallback((docId, e) => {
    e?.stopPropagation();
    setTabs(prev => {
      const idx = prev.findIndex(tab => tab.id === docId);
      const next = prev.filter(tab => tab.id !== docId);
      // If we just closed the active tab, fall back to the neighbour at the
      // same index (or the last tab if we closed the rightmost one).
      setActiveTabId(cur => {
        if (cur !== docId) {
          return cur;
        }
        if (next.length === 0) {
          return null;
        }
        return next[Math.min(idx, next.length - 1)].id;
      });
      return next;
    });
  }, []);

  const syncTab = useCallback((id, changes) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id !== id) {
        return tab;
      }
      return { ...tab, ...changes };
    }));
  }, []);

  const activeDoc = tabs.find(tab => tab.id === activeTabId) || null;

  return {
    tabs,
    activeTabId,
    activeDoc,
    openTab,
    closeTab,
    syncTab,
    setActiveTabId,
  };
};
