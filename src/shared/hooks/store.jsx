import { useState, useCallback, useEffect, useRef } from "react";
import { utils } from "../_utils";
import { StoreConstants } from "../_constants";

// ── Persistence ───────────────────────────────────────────────────────────
//
// localStorage round-trip. Dates serialise to strings, so revive them on load.
const _load = () => {
  try {
    const raw = localStorage.getItem(StoreConstants.STORAGE_KEY);
    if (!raw) {
      return StoreConstants.WS_SEEDS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      return StoreConstants.WS_SEEDS;
    }
    return parsed.map(w => ({
      ...w,
      docs: (w.docs || []).map(d => ({
        ...d,
        modified: d.modified ? new Date(d.modified) : new Date(),
        created: d.created ? new Date(d.created) : (d.modified ? new Date(d.modified) : new Date()),
      })),
    }));
  } catch {
    return StoreConstants.WS_SEEDS;
  }
};

const _save = ws => {
  try {
    localStorage.setItem(StoreConstants.STORAGE_KEY, JSON.stringify(ws));
    return true;
  } catch {
    return false;
  }
};

const _loadActive = ws => {
  try {
    const id = localStorage.getItem(StoreConstants.ACTIVE_KEY);
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
      localStorage.setItem(StoreConstants.ACTIVE_KEY, activeId || "");
    } catch {
      // Ignore quota/availability errors — active id will just not persist.
    }
  }, [activeId]);

  const createWS = useCallback((name, emoji, color) => {
    const w = {
      id: utils._uid(),
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
    if (!ws.length) {
      return null;
    }
    // Fall back to the first workspace if activeId is stale — mirrors the
    // `active` selector so we never silently no-op on a stale id.
    const target = ws.find(w => w.id === activeId) || ws[0];
    const now = new Date();
    const doc = {
      id: utils._uid(),
      title: utils._uniqueTitle(target.docs, type, title || utils._autoName(type)),
      type,
      created: now,
      modified: now,
      starred: false,
      content: "",
      appColor,
    };
    setWS(p => p.map(w => {
      if (w.id !== target.id) {
        return w;
      }
      return { ...w, docs: [doc, ...w.docs] };
    }));
    return doc;
  }, [ws, activeId]);

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
            next.title = utils._uniqueTitle(w.docs, d.type, ch.title, id);
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
//
// Stored as a flat `{ "<wsId>:<appId>": "#hex" }` map. Persisted across
// sessions so per-app picks survive a reload.
const _loadAppColors = () => {
  try {
    const raw = localStorage.getItem(StoreConstants.APP_COLORS_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const useAppColors = () => {
  const [ov, set] = useState(_loadAppColors);

  useEffect(() => {
    try {
      localStorage.setItem(StoreConstants.APP_COLORS_KEY, JSON.stringify(ov));
    } catch {
      // Ignore quota / availability — overrides just won't persist.
    }
  }, [ov]);

  const get = useCallback(
    (wsId, appId, def) => ov[`${wsId}:${appId}`] || def,
    [ov],
  );
  const put = useCallback(
    (wsId, appId, c) => set(p => ({ ...p, [`${wsId}:${appId}`]: c })),
    [],
  );
  // Clear the override so callers fall back to whatever default they pass
  // to `get` (the theme accent in display contexts).
  const del = useCallback((wsId, appId) => set(p => {
    const next = { ...p };
    delete next[`${wsId}:${appId}`];
    return next;
  }), []);
  return { get, put, del };
};

// ── Enabled beta apps ─────────────────────────────────────────────────────
//
// Beta-status apps (see registry.APPS) are hidden from the side nav by default.
// Users opt them in from the Catalogue screen; selections persist as a list of
// app ids in localStorage.
const _loadEnabledBetas = () => {
  try {
    const raw = localStorage.getItem(StoreConstants.ENABLED_BETAS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const useEnabledBetas = () => {
  const [ids, setIds] = useState(_loadEnabledBetas);

  useEffect(() => {
    try {
      localStorage.setItem(StoreConstants.ENABLED_BETAS_KEY, JSON.stringify(ids));
    } catch {
      // Ignore quota / availability — selection just won't persist.
    }
  }, [ids]);

  const has = useCallback(id => ids.includes(id), [ids]);
  const toggle = useCallback(id => {
    setIds(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));
  }, []);

  return { ids, has, toggle };
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
