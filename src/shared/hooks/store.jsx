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
    return parsed.map(rawWorkspace => ({
      ...rawWorkspace,
      docs: (rawWorkspace.docs || []).map(rawDoc => ({
        ...rawDoc,
        modified: rawDoc.modified ? new Date(rawDoc.modified) : new Date(),
        created: rawDoc.created
          ? new Date(rawDoc.created)
          : (rawDoc.modified ? new Date(rawDoc.modified) : new Date()),
      })),
    }));
  } catch {
    return StoreConstants.WS_SEEDS;
  }
};

const _save = workspaces => {
  try {
    localStorage.setItem(StoreConstants.STORAGE_KEY, JSON.stringify(workspaces));
    return true;
  } catch {
    return false;
  }
};

const _loadActive = workspaces => {
  try {
    const storedActiveId = localStorage.getItem(StoreConstants.ACTIVE_KEY);
    if (storedActiveId && workspaces.some(workspace => workspace.id === storedActiveId)) {
      return storedActiveId;
    }
  } catch {
    // Ignore — fall through to first workspace.
  }
  return workspaces[0]?.id;
};

// ── §6  STORE HOOKS ───────────────────────────────────────────────────────
export const useWSStore = () => {
  const [ws, setWS] = useState(_load);
  const [activeId, setActiveId] = useState(() => _loadActive(_load()));
  const active = ws.find(workspace => workspace.id === activeId) || ws[0];

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
    const newWorkspace = {
      id: utils._uid(),
      name,
      emoji: emoji || "",
      color: color || "#C8A253",
      docs: [],
    };
    setWS(prevWorkspaces => [...prevWorkspaces, newWorkspace]);
    setActiveId(newWorkspace.id);
    return newWorkspace;
  }, []);

  const renameWS = useCallback((workspaceId, name) => {
    if (!name?.trim()) {
      return;
    }
    setWS(prevWorkspaces => prevWorkspaces.map(workspace => {
      if (workspace.id !== workspaceId) {
        return workspace;
      }
      return { ...workspace, name: name.trim() };
    }));
  }, []);

  const deleteWS = useCallback(workspaceId => {
    setWS(prevWorkspaces => {
      if (prevWorkspaces.length <= 1) {
        return prevWorkspaces;
      }
      const remainingWorkspaces = prevWorkspaces.filter(workspace => workspace.id !== workspaceId);
      if (workspaceId === activeId) {
        setActiveId(remainingWorkspaces[0].id);
      }
      return remainingWorkspaces;
    });
  }, [activeId]);

  const createDoc = useCallback((type, title, appColor) => {
    if (!ws.length) {
      return null;
    }
    // Fall back to the first workspace if activeId is stale — mirrors the
    // `active` selector so we never silently no-op on a stale id.
    const targetWorkspace = ws.find(workspace => workspace.id === activeId) || ws[0];
    const now = new Date();
    const doc = {
      id: utils._uid(),
      title: utils._uniqueTitle(targetWorkspace.docs, type, title || utils._autoName(type)),
      type,
      created: now,
      modified: now,
      starred: false,
      content: "",
      appColor,
    };
    setWS(prevWorkspaces => prevWorkspaces.map(workspace => {
      if (workspace.id !== targetWorkspace.id) {
        return workspace;
      }
      return { ...workspace, docs: [doc, ...workspace.docs] };
    }));
    return doc;
  }, [ws, activeId]);

  const updateDoc = useCallback((docId, changes) => {
    let resolved = changes;
    setWS(prevWorkspaces => prevWorkspaces.map(workspace => {
      if (workspace.id !== activeId) {
        return workspace;
      }
      return {
        ...workspace,
        docs: workspace.docs.map(workspaceDoc => {
          if (workspaceDoc.id !== docId) {
            return workspaceDoc;
          }
          const nextDoc = { ...workspaceDoc, ...changes, modified: new Date() };
          // Title changes need uniqueness enforcement against siblings.
          if (changes.title !== undefined && changes.title !== workspaceDoc.title) {
            nextDoc.title = utils._uniqueTitle(workspace.docs, workspaceDoc.type, changes.title, docId);
            resolved = { ...changes, title: nextDoc.title };
          }
          return nextDoc;
        }),
      };
    }));
    return resolved;
  }, [activeId]);

  const deleteDoc = useCallback(docId => {
    setWS(prevWorkspaces => prevWorkspaces.map(workspace => {
      if (workspace.id !== activeId) {
        return workspace;
      }
      return {
        ...workspace,
        docs: workspace.docs.filter(workspaceDoc => workspaceDoc.id !== docId),
      };
    }));
  }, [activeId]);

  const toggleStar = useCallback(docId => {
    setWS(prevWorkspaces => prevWorkspaces.map(workspace => {
      if (workspace.id !== activeId) {
        return workspace;
      }
      return {
        ...workspace,
        docs: workspace.docs.map(workspaceDoc => {
          if (workspaceDoc.id !== docId) {
            return workspaceDoc;
          }
          return { ...workspaceDoc, starred: !workspaceDoc.starred };
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
  const [overrides, setOverrides] = useState(_loadAppColors);

  useEffect(() => {
    try {
      localStorage.setItem(StoreConstants.APP_COLORS_KEY, JSON.stringify(overrides));
    } catch {
      // Ignore quota / availability — overrides just won't persist.
    }
  }, [overrides]);

  const get = useCallback(
    (wsId, appId, defaultColor) => overrides[`${wsId}:${appId}`] || defaultColor,
    [overrides],
  );
  const put = useCallback(
    (wsId, appId, color) =>
      setOverrides(prevOverrides => ({ ...prevOverrides, [`${wsId}:${appId}`]: color })),
    [],
  );
  // Clear the override so callers fall back to whatever default they pass
  // to `get` (the theme accent in display contexts).
  const del = useCallback((wsId, appId) => setOverrides(prevOverrides => {
    const nextOverrides = { ...prevOverrides };
    delete nextOverrides[`${wsId}:${appId}`];
    return nextOverrides;
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
  const [enabledBetaIds, setEnabledBetaIds] = useState(_loadEnabledBetas);

  useEffect(() => {
    try {
      localStorage.setItem(StoreConstants.ENABLED_BETAS_KEY, JSON.stringify(enabledBetaIds));
    } catch {
      // Ignore quota / availability — selection just won't persist.
    }
  }, [enabledBetaIds]);

  const has = useCallback(appId => enabledBetaIds.includes(appId), [enabledBetaIds]);
  const toggle = useCallback(appId => {
    setEnabledBetaIds(prevIds =>
      prevIds.includes(appId)
        ? prevIds.filter(currentId => currentId !== appId)
        : [...prevIds, appId],
    );
  }, []);

  return { ids: enabledBetaIds, has, toggle };
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

  const closeTab = useCallback((docId, mouseEvent) => {
    mouseEvent?.stopPropagation();
    setTabs(prevTabs => {
      const closingIndex = prevTabs.findIndex(tab => tab.id === docId);
      const remainingTabs = prevTabs.filter(tab => tab.id !== docId);
      // If we just closed the active tab, fall back to the neighbour at the
      // same index (or the last tab if we closed the rightmost one).
      setActiveTabId(currentActiveId => {
        if (currentActiveId !== docId) {
          return currentActiveId;
        }
        if (remainingTabs.length === 0) {
          return null;
        }
        return remainingTabs[Math.min(closingIndex, remainingTabs.length - 1)].id;
      });
      return remainingTabs;
    });
  }, []);

  const syncTab = useCallback((tabId, changes) => {
    setTabs(prevTabs => prevTabs.map(tab => {
      if (tab.id !== tabId) {
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
