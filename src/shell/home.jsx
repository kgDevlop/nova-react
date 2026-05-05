import React, { useState, useMemo, useRef, useEffect } from "react";
import { I } from "../shared/icons";
import { useT } from "../shared/theme";
import { useKbd, useOut } from "../shared/hooks/system";
import { AppChip, TileGrid } from "../shared/atoms";
import { HomeConstants } from "../shared/_constants";
import { utils, registry as registryU } from "../shared/_utils";

// ── Doc tile (grid view) ────────────────────────────────────────────────────

const DocTile = ({ doc, onOpen, onStar, onDelete, onRename, getAppColor, activeWS }) => {
  const theme = useT();
  const appDef = registryU._app(doc.type);
  // Always resolve dynamically so theme/scheme changes flow through to old
  // docs too. Pre-existing `doc.appColor` values from older builds are ignored.
  const accentColor = getAppColor(activeWS.id, doc.type, theme.appColorFor(doc.type));
  const softAccent  = accentColor + (theme.isDark ? "1A" : "22");

  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState(doc.title);

  const menuRef = useRef(null);
  const renameInputRef = useRef(null);

  useOut(menuRef, () => setMenuOpen(false));

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
    }
  }, [isRenaming]);

  const commitRename = () => {
    if (titleDraft.trim() && titleDraft !== doc.title) {
      onRename(doc.id, titleDraft.trim());
    }
    setIsRenaming(false);
  };

  return (
    <div
      className="ncard"
      onClick={() => {
        // Don't open the doc while the user is renaming or has the menu open.
        if (!isRenaming && !menuOpen) {
          onOpen(doc);
        }
      }}
      style={{
        padding: 13,
        cursor: "pointer",
        animation: "fadeUp 0.25s ease both",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        position: "relative",
        zIndex: menuOpen ? 50 : undefined,
      }}
    >
      {/* Preview block — fake content lines tinted with the app color */}
      <div
        style={{
          height: 62,
          borderRadius: theme.radius10,
          background: softAccent,
          border: `1px solid ${accentColor}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: "11px 13px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {HomeConstants.CARD_PREVIEW_BAR_WIDTHS.map((widthPercent, barIndex) => (
            <div
              key={barIndex}
              style={{
                height: 4,
                borderRadius: 2,
                background: accentColor,
                opacity: 0.12 + barIndex * 0.04,
                width: `${widthPercent}%`,
              }}
            />
          ))}
        </div>
        <appDef.Icon
          size={18}
          color={accentColor}
          style={{ position: "relative", zIndex: 1, opacity: 0.55 }}
        />
      </div>

      {/* Row 1 — name */}
      <div style={{ minWidth: 0 }}>
        {isRenaming ? (
          <input
            ref={renameInputRef}
            className="ninput"
            style={{ fontSize: 12, padding: "2px 6px", fontWeight: 600 }}
            value={titleDraft}
            onChange={titleChangeEvent => setTitleDraft(titleChangeEvent.target.value)}
            onKeyDown={titleKeyDownEvent => {
              if (titleKeyDownEvent.key === "Enter") {
                commitRename();
              }
              if (titleKeyDownEvent.key === "Escape") {
                setIsRenaming(false);
              }
            }}
            onBlur={commitRename}
            onClick={inputClickEvent => inputClickEvent.stopPropagation()}
          />
        ) : (
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: theme.text,
              lineHeight: 1.35,
              minHeight: "2.7em",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {doc.title}
          </div>
        )}
      </div>

      {/* Row 2 — details (type chip + timestamp) and tile actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span className="nbadge" style={{ background: softAccent, color: accentColor }}>
          {appDef.label}
        </span>
        <span
          style={{
            fontSize: 10,
            color: theme.textMuted,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <I.Clock size={9} color={theme.textMuted} />
          {utils._rel(doc.modified)}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4, flexShrink: 0 }}>
          <button
            className="nb"
            style={{
              padding: "4px 6px",
              background: doc.starred ? theme.accent + "1F" : theme.surfaceAlt,
              color: doc.starred ? theme.accent : theme.textMuted,
              border: `1px solid ${doc.starred ? theme.accent + "55" : theme.border}`,
              borderRadius: theme.radius6,
            }}
            title={doc.starred ? "Unstar" : "Star"}
            onClick={starClickEvent => {
              starClickEvent.stopPropagation();
              onStar(doc.id);
            }}
          >
            <I.Star
              size={11}
              fill={doc.starred ? theme.accent : "none"}
              color={doc.starred ? theme.accent : theme.textMuted}
            />
          </button>

          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              className="nb"
              style={{
                padding: "4px 6px",
                background: theme.surfaceAlt,
                color: theme.textDim,
                border: `1px solid ${theme.border}`,
                borderRadius: theme.radius6,
              }}
              onClick={menuClickEvent => {
                menuClickEvent.stopPropagation();
                setMenuOpen(currentlyOpen => !currentlyOpen);
              }}
            >
              <I.Dots size={11} color={theme.textDim} />
            </button>
            {menuOpen && (
              <div className="nmenu" onClick={menuItemClickEvent => menuItemClickEvent.stopPropagation()}>
                <div
                  className="nmi"
                  onClick={() => {
                    setMenuOpen(false);
                    setTitleDraft(doc.title);
                    setIsRenaming(true);
                  }}
                >
                  <I.Pencil size={12} /> Rename
                </div>
                <div
                  className="nmi"
                  onClick={() => {
                    setMenuOpen(false);
                    onStar(doc.id);
                  }}
                >
                  <I.Star size={12} /> {doc.starred ? "Unstar" : "Star"}
                </div>
                <div className="nmi">
                  <I.Copy size={12} /> Duplicate
                </div>
                <div className="ndiv" />
                <div
                  className="nmi danger"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(doc.id);
                  }}
                >
                  <I.Trash size={12} /> Delete
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Doc row (list view) ─────────────────────────────────────────────────────

const DocRow = ({ doc, onOpen, onStar, onDelete, getAppColor, activeWS }) => {
  const theme = useT();
  const appDef     = registryU._app(doc.type);
  const accentColor = getAppColor(activeWS.id, doc.type, theme.appColorFor(doc.type));
  const softAccent  = accentColor + (theme.isDark ? "1A" : "22");

  return (
    <div
      className="ncard"
      onClick={() => onOpen(doc)}
      style={{
        padding: "9px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        animation: "fadeUp 0.22s ease both",
      }}
    >
      <AppChip appId={doc.type} size={30} colorOverride={accentColor} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: theme.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {doc.title}
        </div>
        <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 1 }}>
          {utils._rel(doc.modified)}
        </div>
      </div>
      <span
        className="nbadge"
        style={{ background: softAccent, color: accentColor, flexShrink: 0 }}
      >
        {appDef.label}
      </span>
      <button
        className="nb ni"
        style={{
          color: doc.starred ? theme.accent : theme.textMuted,
          padding: 3,
          flexShrink: 0,
        }}
        onClick={starClickEvent => {
          starClickEvent.stopPropagation();
          onStar(doc.id);
        }}
      >
        <I.Star
          size={11}
          fill={doc.starred ? theme.accent : "none"}
          color={doc.starred ? theme.accent : theme.textMuted}
        />
      </button>
      <button
        className="nb ni"
        style={{ padding: 3, flexShrink: 0 }}
        onClick={deleteClickEvent => {
          deleteClickEvent.stopPropagation();
          onDelete(doc.id);
        }}
      >
        <I.Trash size={11} />
      </button>
    </div>
  );
};

// ── Home screen ─────────────────────────────────────────────────────────────

export const HomeScreen = ({
  activeWS,
  view,
  onOpen,
  onNewDoc,
  onStar,
  onDelete,
  onRename,
  getAppColor,
  isMobile,
}) => {
  const theme = useT();
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState("modified");
  const [viewMode, setViewMode] = useState("grid");
  const [favOnly, setFavOnly] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const searchRef = useRef(null);
  useKbd("k", () => searchRef.current?.focus());

  // On mobile the search input is hidden behind an icon button; opening it
  // focuses the field.
  useEffect(() => {
    if (isMobile && searchOpen) {
      searchRef.current?.focus();
    }
  }, [isMobile, searchOpen]);

  // Grid sizing: slider picks a column count, snapped to ticks. Max columns is
  // recomputed from the grid's measured width so the upper bound matches what
  // can actually fit on screen at HomeConstants.GRID_MIN_CARD_PX per card.
  const gridRef = useRef(null);
  const [maxCols, setMaxCols] = useState(6);
  useEffect(() => {
    const gridElement = gridRef.current;
    if (!gridElement || typeof ResizeObserver === "undefined") return;
    const resizeObserver = new ResizeObserver(([resizeEntry]) => {
      const measuredWidth = resizeEntry.contentRect.width;
      setMaxCols(Math.max(2, Math.min(8, Math.floor((measuredWidth + 9) / (HomeConstants.GRID_MIN_CARD_PX + 9)))));
    });
    resizeObserver.observe(gridElement);
    return () => resizeObserver.disconnect();
  }, [viewMode]);

  const [savedCols, setSavedCols] = useState(() => {
    if (typeof window === "undefined") return 0;
    const storedCols = Number(window.localStorage.getItem(HomeConstants.GRID_COLS_KEY));
    return Number.isFinite(storedCols) && storedCols >= 2 ? storedCols : 0;
  });
  const defaultCols = Math.max(2, Math.round((2 + maxCols) / 2));
  const cols = savedCols ? Math.min(Math.max(savedCols, 2), maxCols) : defaultCols;
  const [sliderPos, setSliderPos] = useState(cols);
  useEffect(() => {
    setSliderPos(currentSliderPos => Math.min(Math.max(currentSliderPos, 2), maxCols));
  }, [maxCols]);

  const visible = useMemo(() => {
    let filteredDocs = utils._filterV(activeWS.docs, view);
    if (favOnly) filteredDocs = filteredDocs.filter(workspaceDoc => workspaceDoc.starred);
    return utils._sortD(utils._filterQ(filteredDocs, searchQuery), sort);
  }, [activeWS.docs, view, searchQuery, sort, favOnly]);

  // Quick-start tiles: all apps on home, just the current app on a filtered view.
  // Calendar is a singleton and lives outside the doc-creation flow.
  let quickStartAppIds;
  if (view === "home") {
    quickStartAppIds = HomeConstants.APPS.filter(app => app.appId !== "calendar").map(app => app.appId);
  } else if (HomeConstants.APPS.map(app => app.appId).includes(view)) {
    quickStartAppIds = [view];
  } else {
    quickStartAppIds = null;
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "26px 22px 48px",
      }}
    >
      {view !== "home" && (
        <div
          style={{
            marginBottom: 26,
            animation: "fadeUp 0.3s ease both",
          }}
        >
          <h1
            style={{
              fontSize: 23,
              fontWeight: 800,
              color: theme.text,
              letterSpacing: "-0.03em",
            }}
          >
            {utils._vtitle(view)}
          </h1>
        </div>
      )}

      {quickStartAppIds && !isMobile && (
        <div
          style={{
            marginBottom: 26,
            animation: "fadeUp 0.3s ease 0.08s both",
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: theme.textMuted,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Quick start
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {quickStartAppIds.map(appId => {
              const appDef     = registryU._app(appId);
              const accentColor = getAppColor(activeWS.id, appId, theme.appColorFor(appId));
              return (
                <button
                  key={appId}
                  onClick={() => onNewDoc(appId)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 13px",
                    borderRadius: theme.radius14,
                    background: accentColor + (theme.isDark ? "1A" : "22"),
                    border: `1px solid ${accentColor}22`,
                    cursor: "pointer",
                    transition: theme.transition,
                    fontFamily: theme.fontFamily,
                    outline: "none",
                    color: theme.text,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                  onMouseEnter={mouseEnterEvent => {
                    mouseEnterEvent.currentTarget.style.borderColor = accentColor + "55";
                  }}
                  onMouseLeave={mouseLeaveEvent => {
                    mouseLeaveEvent.currentTarget.style.borderColor = accentColor + "22";
                  }}
                >
                  <appDef.Icon size={13} color={accentColor} /> New {appDef.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Doc count, view toggle, favorites, sort, search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 11,
          flexWrap: "wrap",
          animation: "fadeUp 0.3s ease 0.1s both",
        }}
      >
        <span style={{ fontSize: 10, color: theme.textMuted }}>
          {visible.length} doc{visible.length !== 1 ? "s" : ""}
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          {[["grid", I.Grid], ["list", I.List]].map(([viewModeOption, ViewModeIcon]) => (
            <button
              key={viewModeOption}
              className="nb ni"
              style={{
                color: viewMode === viewModeOption ? theme.text : theme.textMuted,
                background: viewMode === viewModeOption ? theme.surfaceAlt : "transparent",
              }}
              onClick={() => setViewMode(viewModeOption)}
            >
              <ViewModeIcon size={13} />
            </button>
          ))}
        </div>
        {viewMode === "grid" && !isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="range"
              min={2}
              max={maxCols}
              step="any"
              value={sliderPos}
              title={`${cols} per row`}
              onChange={sliderChangeEvent => {
                const sliderValue = Number(sliderChangeEvent.target.value);
                setSliderPos(sliderValue);
                const snappedCols = Math.min(Math.max(Math.round(sliderValue), 2), maxCols);
                setSavedCols(snappedCols);
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(HomeConstants.GRID_COLS_KEY, String(snappedCols));
                }
              }}
              style={{ width: 115, accentColor: theme.accent, cursor: "pointer" }}
            />
          </div>
        )}
        {!isMobile && (
          <>
            <button
              className="nb"
              title={favOnly ? "Show all" : "Show favorites only"}
              aria-pressed={favOnly}
              onClick={() => setFavOnly(currentFavOnly => !currentFavOnly)}
              style={{
                padding: "6px 10px",
                fontSize: 11,
                fontWeight: 600,
                background: favOnly ? theme.accent + "1F" : theme.surface,
                color: favOnly ? theme.accent : theme.textDim,
                border: `1px solid ${favOnly ? theme.accent + "55" : theme.border}`,
                borderRadius: theme.radius10,
              }}
            >
              <I.Star size={11} fill={favOnly ? theme.accent : "none"} color={favOnly ? theme.accent : theme.textDim} />
              Favorites
            </button>
            <select
              value={sort}
              onChange={desktopSortChangeEvent => setSort(desktopSortChangeEvent.target.value)}
              style={{
                background: theme.surface,
                border: `1px solid ${theme.border}`,
                color: theme.textDim,
                fontFamily: theme.fontFamily,
                fontSize: 11,
                borderRadius: theme.radius10,
                padding: "6px 23px 6px 9px",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="modified">Last modified</option>
              <option value="name">Name A→Z</option>
              <option value="type">App type</option>
            </select>
          </>
        )}
        {isMobile && !searchOpen ? null : (
          <div style={{ position: "relative", flex: 1, marginLeft: "auto", minWidth: 150, maxWidth: isMobile ? undefined : 300 }}>
            <div
              style={{
                position: "absolute",
                left: 9,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            >
              <I.Search size={11} color={theme.textMuted} />
            </div>
            <input
              ref={searchRef}
              className="ninput"
              style={{ paddingLeft: 27, paddingRight: isMobile ? 28 : 12, fontSize: 12 }}
              placeholder="Search…"
              value={searchQuery}
              onChange={searchChangeEvent => setSearchQuery(searchChangeEvent.target.value)}
              onKeyDown={searchKeyDownEvent => {
                if (searchKeyDownEvent.key === "Escape" && isMobile) {
                  setSearchQuery("");
                  setSearchOpen(false);
                }
              }}
            />
            {isMobile && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchOpen(false);
                }}
                title="Close search"
                style={{
                  position: "absolute",
                  right: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: theme.textMuted,
                  display: "flex",
                  padding: 4,
                  borderRadius: theme.radius6,
                }}
              >
                <I.X size={11} />
              </button>
            )}
          </div>
        )}
        {isMobile && (
          <div style={{ display: "flex", gap: 6, marginLeft: searchOpen ? 0 : "auto" }}>
            <button
              className="nb ni"
              title={favOnly ? "Show all" : "Show favorites only"}
              aria-pressed={favOnly}
              onClick={() => setFavOnly(currentFavOnly => !currentFavOnly)}
              style={{
                padding: 7,
                background: favOnly ? theme.accent + "1F" : theme.surface,
                color: favOnly ? theme.accent : theme.textDim,
                border: `1px solid ${favOnly ? theme.accent + "55" : theme.border}`,
                borderRadius: theme.radius10,
              }}
            >
              <I.Star size={13} fill={favOnly ? theme.accent : "none"} color={favOnly ? theme.accent : theme.textDim} />
            </button>
            <div style={{ position: "relative", display: "flex" }}>
              <button
                className="nb ni"
                title={`Sort: ${sort === "modified" ? "Last modified" : sort === "name" ? "Name A→Z" : "App type"}`}
                style={{
                  padding: 7,
                  background: theme.surface,
                  color: theme.textDim,
                  border: `1px solid ${theme.border}`,
                  borderRadius: theme.radius10,
                  pointerEvents: "none",
                }}
                tabIndex={-1}
              >
                <I.SortAsc size={13} color={theme.textDim} />
              </button>
              <select
                value={sort}
                onChange={sortChangeEvent => setSort(sortChangeEvent.target.value)}
                aria-label="Sort"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  opacity: 0,
                  cursor: "pointer",
                  fontFamily: theme.fontFamily,
                }}
              >
                <option value="modified">Last modified</option>
                <option value="name">Name A→Z</option>
                <option value="type">App type</option>
              </select>
            </div>
            {!searchOpen && (
              <button
                className="nb ni"
                onClick={() => setSearchOpen(true)}
                title="Search"
                style={{
                  padding: 7,
                  border: `1px solid ${theme.border}`,
                  borderRadius: theme.radius10,
                  background: theme.surface,
                }}
              >
                <I.Search size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {visible.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "44px 0",
            animation: "fadeIn 0.3s ease both",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: theme.radius20,
              background: theme.surfaceAlt,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 13px",
            }}
          >
            <I.File size={20} color={theme.textMuted} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: theme.textDim, marginBottom: 5 }}>
            {searchQuery ? `No results for "${searchQuery}"` : "No documents yet"}
          </p>
          <p style={{ fontSize: 12, color: theme.textMuted, marginBottom: 18 }}>
            {searchQuery ? "Try a different search term" : "Create your first document to get started"}
          </p>
          {!searchQuery && (
            <button
              className="nb np"
              onClick={() => onNewDoc(HomeConstants.APPS.some(app => app.appId === view) ? view : undefined)}
            >
              <I.Plus size={13} /> New document
            </button>
          )}
        </div>
      )}

      {visible.length > 0 && viewMode === "grid" && (
        <TileGrid
          gridRef={gridRef}
          cols={isMobile ? undefined : cols}
          min={HomeConstants.GRID_MIN_CARD_PX}
          style={{ animation: "fadeUp 0.3s ease 0.12s both" }}
        >
          {visible.map(doc => (
            <DocTile
              key={doc.id}
              doc={doc}
              onOpen={onOpen}
              onStar={onStar}
              onDelete={onDelete}
              onRename={onRename}
              getAppColor={getAppColor}
              activeWS={activeWS}
            />
          ))}
        </TileGrid>
      )}

      {visible.length > 0 && viewMode === "list" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            animation: "fadeUp 0.3s ease 0.12s both",
          }}
        >
          {visible.map(doc => (
            <DocRow
              key={doc.id}
              doc={doc}
              onOpen={onOpen}
              onStar={onStar}
              onDelete={onDelete}
              getAppColor={getAppColor}
              activeWS={activeWS}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Catalogue screen ────────────────────────────────────────────────────

export const AppCatalogueScreen = ({ onNewDoc, getAppColor, activeWS, isBetaEnabled, onToggleBeta }) => {
  const theme = useT();
  const categories = [...new Set(HomeConstants.APPS.map(app => app.category))];

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "26px 22px 48px" }}>
      <div style={{ marginBottom: 24, animation: "fadeUp 0.3s ease both" }}>
        <h1
          style={{
            fontSize: 23,
            fontWeight: 800,
            color: theme.text,
            letterSpacing: "-0.03em",
            marginBottom: 4,
          }}
        >
          Catalogue
        </h1>
        <p style={{ fontSize: 12, color: theme.textDim }}>
          Click any tile to create a new document instantly.
        </p>
      </div>

      {categories.map((category, categoryIndex) => (
        <div
          key={category}
          style={{
            marginBottom: 28,
            animation: `fadeUp 0.3s ease ${categoryIndex * 0.06}s both`,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: theme.textMuted,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            {category}
          </div>
          <TileGrid min={210}>
            {HomeConstants.APPS.filter(app => app.category === category).map(app => {
              const accentColor = getAppColor(activeWS.id, app.appId, theme.appColorFor(app.appId));
              const softAccent  = accentColor + (theme.isDark ? "1A" : "22");
              const isBeta      = app.status === "beta";
              const enabled     = isBeta && isBetaEnabled?.(app.appId);
              return (
                <div
                  key={app.appId}
                  onClick={() => onNewDoc(app.appId)}
                  style={{
                    padding: 15,
                    borderRadius: theme.radius14,
                    border: `1px solid ${theme.border}`,
                    background: theme.surface,
                    cursor: "pointer",
                    transition: theme.transition,
                    position: "relative",
                  }}
                  onMouseEnter={mouseEnterEvent => {
                    mouseEnterEvent.currentTarget.style.borderColor = accentColor + "44";
                    mouseEnterEvent.currentTarget.style.background = theme.surfaceShade;
                  }}
                  onMouseLeave={mouseLeaveEvent => {
                    mouseLeaveEvent.currentTarget.style.borderColor = theme.border;
                    mouseLeaveEvent.currentTarget.style.background = theme.surface;
                  }}
                >
                  <span
                    className="nbadge"
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      background: isBeta ? "rgba(232,123,58,0.15)" : "rgba(59,181,128,0.15)",
                      color: isBeta ? "#E87B3A" : "#3BB580",
                    }}
                  >
                    {isBeta ? "Beta" : "Live"}
                  </span>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: theme.radius10,
                      background: softAccent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 10,
                    }}
                  >
                    <app.Icon size={18} color={accentColor} />
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: theme.text,
                      marginBottom: 3,
                    }}
                  >
                    {app.label}
                  </div>
                  <div style={{ fontSize: 11, color: theme.textDim, lineHeight: 1.5 }}>
                    {app.description}
                  </div>
                  {isBeta && (
                    <div
                      onClick={betaToggleClickEvent => {
                        betaToggleClickEvent.stopPropagation();
                        onToggleBeta?.(app.appId);
                      }}
                      style={{
                        marginTop: 12,
                        paddingTop: 10,
                        borderTop: `1px dashed ${theme.border}`,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: 11, color: theme.textDim, flex: 1 }}>
                        Show in sidebar
                      </span>
                      <span
                        role="switch"
                        aria-checked={enabled}
                        style={{
                          width: 26,
                          height: 15,
                          borderRadius: 999,
                          background: enabled ? accentColor : theme.border,
                          position: "relative",
                          transition: theme.transition,
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: 2,
                            left: enabled ? 13 : 2,
                            width: 11,
                            height: 11,
                            borderRadius: "50%",
                            background: "#fff",
                            transition: theme.transition,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
                          }}
                        />
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </TileGrid>
        </div>
      ))}
    </div>
  );
};
