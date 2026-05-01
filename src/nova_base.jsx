import React, { useState, useEffect, useCallback, useContext, useRef } from "react";
import { I } from "./shared/icons";
import { TC, ThemeProvider } from "./shared/theme";
import { NotifProvider, useNotify } from "./shared/notifications";
import { useStyles } from "./shared/styling";
import { useDeviceCaps, useKbd } from "./shared/hooks/system";
import { useWSStore, useTabs, useAppColors } from "./shared/hooks/store";
import { NovaLogo } from "./shared/atoms";
import { Sidebar, MobSidebar, MobTopBar } from "./shared/left_sidebar";
import { TabBar } from "./shared/utils_bar";
import { NewDocModal } from "./shared/modals/new_doc_popup";
import { NewWSModal } from "./shared/modals/newws";
import { SettingsPanel } from "./shared/modals/nova_settings";
import { CommandPalette } from "./shared/modals/palette";
import { ShortcutsModal } from "./shared/modals/shortcuts";
import { AppShell } from "./shell/shell";
import { HomeScreen, AppCatalogueScreen } from "./shell/home";
import { nova_base as C } from "./shared/_constants";
import { registry } from "./shared/_utils";

function NovaApp() {
  const { theme, t, setTheme } = useContext(TC);
  useStyles(t);

  const device = useDeviceCaps();
  const store = useWSStore();
  const ac = useAppColors();
  const tabs = useTabs();
  const notify = useNotify();

  const [view, setView] = useState("home");
  const [showND, setShowND] = useState(false);
  const [ndType, setNdType] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [showMobSB, setShowMobSB] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewWS, setShowNewWS] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mobileDisabled, setMobileDisabled] = useState(() => {
    return localStorage.getItem(C.MOBILE_DISABLED_KEY) === "1";
  });

  useEffect(() => {
    localStorage.setItem(C.MOBILE_DISABLED_KEY, mobileDisabled ? "1" : "0");
  }, [mobileDisabled]);

  const isMobile = device.isMobile && !mobileDisabled;

  // ── Page nav history (back / forward) ────────────────────────────────────
  //
  // Each entry is a single string identifying a "page":
  //   - "home" / "starred" / "all" / "catalogue"      — top-level views
  //   - "<app-id>" (e.g. "writer")                    — app-filtered list
  //   - "doc:<doc-id>"                                — an opened document
  //
  // The list + index are the source of truth. Two effects keep things in sync:
  //   1. pageId effect — when the visible page differs from the entry at idx,
  //      append a new entry (forward navigation) and tag the op as "push".
  //   2. navHist effect — when navHist changes, push browser history if the op
  //      was "push", and otherwise restore the active tab/view to match the
  //      entry at idx (back/forward).
  const pageId = tabs.activeTabId ? `doc:${tabs.activeTabId}` : view;

  const [navHist, setNavHist] = useState(() => ({
    entries: [pageId],
    idx: 0,
  }));
  const navOpRef = useRef("init");

  useEffect(() => {
    setNavHist(h => {
      if (h.entries[h.idx] === pageId) {
        return h;
      }
      navOpRef.current = "push";
      const truncated = h.entries.slice(0, h.idx + 1);
      truncated.push(pageId);
      const trimmed = truncated.slice(-C.HIST_LIMIT);
      return { entries: trimmed, idx: trimmed.length - 1 };
    });
  }, [pageId]);

  const canBack = navHist.idx > 0;
  const canForward = navHist.idx < navHist.entries.length - 1;

  const goBack = useCallback(() => {
    setNavHist(h => (h.idx <= 0 ? h : { ...h, idx: h.idx - 1 }));
  }, []);

  const goForward = useCallback(() => {
    setNavHist(h => (h.idx >= h.entries.length - 1 ? h : { ...h, idx: h.idx + 1 }));
  }, []);

  // Mirror internal navHist onto window.history (so smartphone back gestures
  // traverse our stack) and route the visible view to match the active entry.
  useEffect(() => {
    const op = navOpRef.current;
    navOpRef.current = "idle";

    if (op === "push") {
      window.history.pushState({ appIdx: navHist.idx }, "");
    }

    const target = navHist.entries[navHist.idx];
    if (target === pageId) {
      return;
    }
    // Restoring an entry (back/forward) — switch view/tab to match.
    if (target.startsWith("doc:")) {
      const id = target.slice(4);
      const doc = store.active.docs.find(d => d.id === id);
      if (doc) {
        tabs.openTab(doc);
        return;
      }
      tabs.setActiveTabId(null);
      setView("home");
      return;
    }
    tabs.setActiveTabId(null);
    setView(target);
  }, [navHist]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tag the current browser entry with our index on first mount, so popstate
  // can later identify it.
  useEffect(() => {
    if (window.history.state?.appIdx === undefined) {
      window.history.replaceState({ appIdx: navHist.idx }, "");
    }
  }, []); // eslint-disable-line

  // Listen for back/forward (in-app buttons trigger window.history.back/forward
  // too, so this handles all sources uniformly).
  useEffect(() => {
    const handler = e => {
      const target = e.state?.appIdx;
      if (typeof target !== "number") {
        return;
      }
      setNavHist(h => {
        if (target === h.idx) return h;
        const clamped = Math.max(0, Math.min(h.entries.length - 1, target));
        return { ...h, idx: clamped };
      });
    };
    window.addEventListener("popstate", handler);
    return () => {
      window.removeEventListener("popstate", handler);
    };
  }, []);

  // ── Global shortcuts ──────────────────────────────────────────────────────
  // ⌘N → new doc, ⌘K → command palette
  useKbd("n", () => setShowND(true));
  useKbd("k", () => setShowPalette(v => !v));

  // Sync sidebar highlight with active tab so navigating tabs updates the
  // left-rail selection without any explicit handler wiring. Calendar has no
  // list view, so when its tab closes we fall back to home rather than
  // leaving the sidebar pointed at a non-existent screen.
  useEffect(() => {
    if (tabs.activeDoc) {
      setView(tabs.activeDoc.type);
    } else if (view === "calendar") {
      setView("home");
    }
  }, [tabs.activeDoc?.id]); // eslint-disable-line

  // ── Doc lifecycle handlers ────────────────────────────────────────────────

  // Calendar is a singleton per workspace: the first time it's opened we
  // create the underlying doc, every subsequent open reuses it. The user can
  // never make a second calendar doc via any UI surface.
  const openCalendarSingleton = useCallback(() => {
    const existing = store.active.docs.find(d => d.type === "calendar");
    if (existing) {
      tabs.openTab(existing);
      return;
    }
    const c = ac.get(store.active.id, "calendar", registry._app("calendar").dc);
    const doc = store.createDoc("calendar", "Calendar", c);
    tabs.openTab(doc);
  }, [store, ac, tabs]);

  const openNewDoc = useCallback((type = null) => {
    if (type === "calendar") {
      openCalendarSingleton();
      return;
    }
    if (type) {
      const c = ac.get(store.active.id, type, registry._app(type).dc);
      const doc = store.createDoc(type, "", c);
      tabs.openTab(doc);
      notify("success", `${registry._app(type).label} created`);
    } else {
      setNdType(null);
      setShowND(true);
    }
  }, [store, ac, tabs, notify, openCalendarSingleton]);

  const handleCreate = useCallback((type, title, color) => {
    const doc = store.createDoc(type, title, color);
    tabs.openTab(doc);
    notify("success", `${registry._app(type).label} "${doc.title}" created`);
  }, [store, tabs, notify]);

  const handleOpenDoc = useCallback(doc => {
    // Always pull the freshest copy from the store — `doc` may be stale if
    // it came from a memoised list rendered before the latest update.
    const fresh = store.active.docs.find(d => d.id === doc.id) || doc;
    tabs.openTab(fresh);
  }, [store, tabs]);

  const handleNav = useCallback(v => {
    if (v === "calendar") {
      // Calendar nav opens its singleton doc directly — there is no list/home
      // view for calendars.
      openCalendarSingleton();
      return;
    }
    setView(v);
    tabs.setActiveTabId(null);
  }, [tabs, openCalendarSingleton]);

  const handleRename = useCallback((id, title) => {
    const resolved = store.updateDoc(id, { title });
    tabs.syncTab(id, { title: resolved.title });
    if (resolved.title === title) {
      notify("success", "Renamed");
    } else {
      notify("success", `Renamed to "${resolved.title}" (name was taken)`);
    }
  }, [store, tabs, notify]);

  const handleUpdateDoc = useCallback((id, changes) => {
    const resolved = store.updateDoc(id, changes);
    if (changes.title) {
      tabs.syncTab(id, { title: resolved.title });
    }
  }, [store, tabs]);

  const handleDelete = useCallback(id => {
    const doc = store.active.docs.find(d => d.id === id);
    store.deleteDoc(id);
    tabs.closeTab(id);
    notify("info", `"${doc?.title || "Document"}" deleted`);
  }, [store, tabs, notify]);

  // ── Render ────────────────────────────────────────────────────────────────

  const isInEditor = !!tabs.activeDoc;

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: t.bg,
        fontFamily: t.fn,
        overflow: "hidden",
        flexDirection: "column",
      }}
    >
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {!isMobile && (
          <Sidebar
            view={view}
            onNav={handleNav}
            onNewDoc={openNewDoc}
            collapsed={collapsed}
            onToggle={() => setCollapsed(v => !v)}
            ws={store.ws}
            active={store.active}
            onSwitch={store.setActiveId}
            onNew={() => setShowNewWS(true)}
            onRenameWS={store.renameWS}
            onDeleteWS={store.deleteWS}
            onSettings={() => setShowSettings(true)}
          />
        )}
        {isMobile && showMobSB && (
          <MobSidebar
            onClose={() => setShowMobSB(false)}
            view={view}
            onNav={handleNav}
            onNewDoc={openNewDoc}
            ws={store.ws}
            active={store.active}
            onSwitch={store.setActiveId}
            onNew={() => setShowNewWS(true)}
            onRenameWS={store.renameWS}
            onDeleteWS={store.deleteWS}
            onSettings={() => setShowSettings(true)}
          />
        )}

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {!isMobile && collapsed && !isInEditor && (
            <div
              style={{
                height: 42,
                borderBottom: `1px solid ${t.bd}`,
                background: t.surface,
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                gap: 8,
                flexShrink: 0,
              }}
            >
              <button
                className="nb ni"
                style={{ padding: 5 }}
                onClick={() => setCollapsed(false)}
              >
                <I.ChevRight size={13} />
              </button>
              <div style={{ width: 1, height: 16, background: t.bd }} />
              
              <span style={{ fontSize: 13, fontWeight: 800, color: t.tx, marginLeft: 2 }}>
                Nova
              </span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: t.tm }}>
                {store.active.emoji} {store.active.name}
              </span>
            </div>
          )}

          {isMobile && (
            <MobTopBar
              onOpen={() => setShowMobSB(true)}
              onSearchClick={() => setShowPalette(true)}
              onBack={() => window.history.back()}
              onForward={() => window.history.forward()}
              canBack={canBack}
              canForward={canForward}
              workspace={store.active}
            />
          )}

          {!isMobile && (
            <TabBar
              tabs={tabs.tabs}
              activeTabId={tabs.activeTabId}
              onSelect={tabs.setActiveTabId}
              onClose={tabs.closeTab}
              getAppColor={ac.get}
              activeWS={store.active}
              onSearchClick={() => setShowPalette(true)}
              onBack={() => window.history.back()}
              onForward={() => window.history.forward()}
              canBack={canBack}
              canForward={canForward}
            />
          )}

          {tabs.activeDoc ? (
            <AppShell
              doc={tabs.activeDoc}
              onBack={() => tabs.closeTab(tabs.activeTabId)}
              getAppColor={ac.get}
              activeWS={store.active}
              updateDoc={handleUpdateDoc}
              isMobile={isMobile}
            />
          ) : view === "catalogue" ? (
            <AppCatalogueScreen
              onNewDoc={openNewDoc}
              getAppColor={ac.get}
              activeWS={store.active}
            />
          ) : (
            <HomeScreen
              activeWS={store.active}
              // Calendar has no list view — coerce to home if state ever
              // lands here (e.g. via history restoration after a tab close).
              view={view === "calendar" ? "home" : view}
              onOpen={handleOpenDoc}
              onNewDoc={openNewDoc}
              onStar={store.toggleStar}
              onDelete={handleDelete}
              onRename={handleRename}
              getAppColor={ac.get}
              isMobile={isMobile}
            />
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showND && (
        <NewDocModal
          initType={ndType}
          onClose={() => {
            setShowND(false);
            setNdType(null);
          }}
          onCreate={handleCreate}
          getAppColor={ac.get}
          activeWS={store.active}
        />
      )}
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          theme={theme}
          setTheme={setTheme}
          getAppColor={ac.get}
          setAppColor={ac.put}
          activeWS={store.active}
          mobileDisabled={mobileDisabled}
          setMobileDisabled={setMobileDisabled}
          onShowShortcuts={() => {
            setShowSettings(false);
            setShowShortcuts(true);
          }}
        />
      )}
      {showNewWS && (
        <NewWSModal
          onClose={() => setShowNewWS(false)}
          onCreate={store.createWS}
        />
      )}
      {showPalette && (
        <CommandPalette
          onClose={() => setShowPalette(false)}
          docs={store.active.docs}
          onOpenDoc={handleOpenDoc}
          onNewDoc={openNewDoc}
          onNav={handleNav}
          setShowSettings={setShowSettings}
          setShowShortcuts={setShowShortcuts}
        />
      )}
      {showShortcuts && (
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
}

export default function NovaOffice() {
  return (
    <ThemeProvider>
      <NotifProvider>
        <NovaApp />
      </NotifProvider>
    </ThemeProvider>
  );
}
