import React, { useState, useEffect, useCallback, useContext } from "react";
import { I } from "../shared/icons";
import { TC } from "../shared/theme";
import { useStyles } from "../shared/styling";
import { useDeviceCaps, useKbd } from "../shared/hooks/system";
import { useWSStore, useTabs, useAppColors, useEnabledBetas } from "../shared/hooks/store";
import { useNavHistory } from "../shared/hooks/nav";
import { Sidebar, MobSidebar, MobTopBar } from "../shared/left_sidebar";
import { TabBar } from "../shared/utils_bar";
import { NewDocModal } from "../shared/modals/new_doc_popup";
import { NewWSModal } from "../shared/modals/newws";
import { SettingsPanel } from "../shared/modals/nova_settings";
import { CommandPalette } from "../shared/modals/palette";
import { ShortcutsModal } from "../shared/modals/shortcuts";
import { AppShell } from "./shell";
import { HomeScreen, AppCatalogueScreen } from "./home";
import { NovaBaseConstants } from "../shared/_constants";
import { registry } from "../shared/_utils";

export function NovaRouter() {
  const { theme, t, setTheme } = useContext(TC);
  useStyles(t);

  const device = useDeviceCaps();
  const store = useWSStore();
  const ac = useAppColors();
  const tabs = useTabs();
  const betas = useEnabledBetas();

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
    return localStorage.getItem(NovaBaseConstants.MOBILE_DISABLED_KEY) === "1";
  });

  useEffect(() => {
    localStorage.setItem(NovaBaseConstants.MOBILE_DISABLED_KEY, mobileDisabled ? "1" : "0");
  }, [mobileDisabled]);

  const isMobile = device.isMobile && !mobileDisabled;

  // ── Page nav history (back / forward) ────────────────────────────────────
  const applyEntry = useCallback(entry => {
    if (entry.kind === "doc") {
      const doc = store.active.docs.find(d => d.id === entry.id);
      if (doc) {
        tabs.openTab(doc);
        return;
      }
      tabs.setActiveTabId(null);
      setView("home");
      return;
    }
    tabs.setActiveTabId(null);
    setView(entry.id);
  }, [store, tabs]);

  const isEntryValid = useCallback(entry => {
    if (entry.kind === "doc") {
      return store.active.docs.some(d => d.id === entry.id);
    }
    return true;
  }, [store]);

  const nav = useNavHistory({ apply: applyEntry, isValid: isEntryValid });

  // ── Global shortcuts ──────────────────────────────────────────────────────
  useKbd("n", () => setShowND(true));
  useKbd("k", () => setShowPalette(v => !v));

  useEffect(() => {
    if (tabs.activeDoc) {
      setView(tabs.activeDoc.type);
    } else if (view === "calendar") {
      setView("home");
    }
  }, [tabs.activeDoc?.id]); // eslint-disable-line

  // ── Doc lifecycle handlers ────────────────────────────────────────────────

  const openDocById = useCallback(docId => {
    const doc = store.active.docs.find(d => d.id === docId);
    if (!doc) return;
    tabs.openTab(doc);
    nav.push({ kind: "doc", id: doc.id });
  }, [store, tabs, nav]);

  const openCalendarSingleton = useCallback(() => {
    const existing = store.active.docs.find(d => d.type === "calendar");
    if (existing) {
      openDocById(existing.id);
      return;
    }
    const doc = store.createDoc("calendar", "Calendar");
    tabs.openTab(doc);
    nav.push({ kind: "doc", id: doc.id });
  }, [store, tabs, nav, openDocById]);

  const openNewDoc = useCallback((type = null) => {
    if (type === "calendar") {
      openCalendarSingleton();
      return;
    }
    if (type) {
      const doc = store.createDoc(type, "");
      tabs.openTab(doc);
      nav.push({ kind: "doc", id: doc.id });
    } else {
      setNdType(null);
      setShowND(true);
    }
  }, [store, tabs, nav, openCalendarSingleton]);

  const handleCreate = useCallback((type, title, color) => {
    const doc = store.createDoc(type, title, color);
    tabs.openTab(doc);
    nav.push({ kind: "doc", id: doc.id });
  }, [store, tabs, nav]);

  const handleOpenDoc = useCallback(doc => {
    openDocById(doc.id);
  }, [openDocById]);

  const handleNav = useCallback(v => {
    if (v === "calendar") {
      openCalendarSingleton();
      return;
    }
    setView(v);
    tabs.setActiveTabId(null);
    nav.push({ kind: "view", id: v });
  }, [tabs, nav, openCalendarSingleton]);

  const handleTabSelect = useCallback(id => {
    if (id === tabs.activeTabId) return;
    tabs.setActiveTabId(id);
    nav.push({ kind: "doc", id });
  }, [tabs, nav]);

  const handleRename = useCallback((id, title) => {
    const resolved = store.updateDoc(id, { title });
    tabs.syncTab(id, { title: resolved.title });
  }, [store, tabs]);

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
  }, [store, tabs]);

  // ── Render ────────────────────────────────────────────────────────────────

  const isInEditor = !!tabs.activeDoc;

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: t.bg,
        fontFamily: t.fontFamily,
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
            getAppColor={ac.get}
            isBetaEnabled={betas.has}
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
            getAppColor={ac.get}
            isBetaEnabled={betas.has}
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
                borderBottom: `1px solid ${t.border}`,
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
              <div style={{ width: 1, height: 16, background: t.border }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: t.text, marginLeft: 2 }}>
                Nova
              </span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: t.textMuted }}>
                {store.active.emoji} {store.active.name}
              </span>
            </div>
          )}

          {isMobile && (
            <MobTopBar
              onOpen={() => setShowMobSB(true)}
              onSearchClick={() => setShowPalette(true)}
              onBack={nav.goBack}
              onForward={nav.goForward}
              canBack={nav.canBack}
              canForward={nav.canForward}
              workspace={store.active}
            />
          )}

          {!isMobile && (
            <TabBar
              tabs={tabs.tabs}
              activeTabId={tabs.activeTabId}
              onSelect={handleTabSelect}
              onClose={tabs.closeTab}
              getAppColor={ac.get}
              activeWS={store.active}
              onSearchClick={() => setShowPalette(true)}
              onBack={nav.goBack}
              onForward={nav.goForward}
              canBack={nav.canBack}
              canForward={nav.canForward}
            />
          )}

          {tabs.activeDoc ? (
            <AppShell
              doc={tabs.activeDoc}
              onBack={nav.goBack}
              getAppColor={ac.get}
              activeWS={store.active}
              updateDoc={handleUpdateDoc}
              isMobile={isMobile}
              onOpenDoc={handleOpenDoc}
            />
          ) : view === "catalogue" ? (
            <AppCatalogueScreen
              onNewDoc={openNewDoc}
              getAppColor={ac.get}
              activeWS={store.active}
              isBetaEnabled={betas.has}
              onToggleBeta={betas.toggle}
            />
          ) : (
            <HomeScreen
              activeWS={store.active}
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
          onClose={() => { setShowND(false); setNdType(null); }}
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
          delAppColor={ac.del}
          activeWS={store.active}
          mobileDisabled={mobileDisabled}
          setMobileDisabled={setMobileDisabled}
          onShowShortcuts={() => { setShowSettings(false); setShowShortcuts(true); }}
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
