import React, { useState, useMemo, useRef, useEffect } from "react";
import { I } from "../shared/icons";
import { useT } from "../shared/theme";
import { useKbd, useOut } from "../shared/hooks/system";
import { AppChip, TileGrid } from "../shared/atoms";
import { home as C, registry } from "../shared/_constants";
import { utils, registry as registryU } from "../shared/_utils";

// ── Doc tile (grid view) ────────────────────────────────────────────────────

const DocTile = ({ doc, onOpen, onStar, onDelete, onRename, getAppColor, activeWS }) => {
  const theme = useT();
  const def = registryU._app(doc.type);
  const c = doc.appColor || getAppColor(activeWS.id, doc.type, def.dc);
  const soft = c + (theme.dk ? "1A" : "22");

  const [menu, setMenu] = useState(false);
  const [ren, setRen] = useState(false);
  const [draft, setDraft] = useState(doc.title);

  const mRef = useRef(null);
  const iRef = useRef(null);

  useOut(mRef, () => setMenu(false));

  useEffect(() => {
    if (ren) {
      iRef.current?.focus();
    }
  }, [ren]);

  const commit = () => {
    if (draft.trim() && draft !== doc.title) {
      onRename(doc.id, draft.trim());
    }
    setRen(false);
  };

  return (
    <div
      className="ncard"
      onClick={() => {
        // Don't open the doc while the user is renaming or has the menu open.
        if (!ren && !menu) {
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
        zIndex: menu ? 50 : undefined,
      }}
    >
      {/* Preview block — fake content lines tinted with the app color */}
      <div
        style={{
          height: 62,
          borderRadius: theme.r10,
          background: soft,
          border: `1px solid ${c}18`,
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
          {C.CARD_PREVIEW_BAR_WIDTHS.map((w, i) => (
            <div
              key={i}
              style={{
                height: 4,
                borderRadius: 2,
                background: c,
                opacity: 0.12 + i * 0.04,
                width: `${w}%`,
              }}
            />
          ))}
        </div>
        <def.Icon
          size={18}
          color={c}
          style={{ position: "relative", zIndex: 1, opacity: 0.55 }}
        />
      </div>

      {/* Row 1 — name */}
      <div style={{ minWidth: 0 }}>
        {ren ? (
          <input
            ref={iRef}
            className="ninput"
            style={{ fontSize: 12, padding: "2px 6px", fontWeight: 600 }}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                commit();
              }
              if (e.key === "Escape") {
                setRen(false);
              }
            }}
            onBlur={commit}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: theme.tx,
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
        <span className="nbadge" style={{ background: soft, color: c }}>
          {def.label}
        </span>
        <span
          style={{
            fontSize: 10,
            color: theme.tm,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <I.Clock size={9} color={theme.tm} />
          {utils._rel(doc.modified)}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4, flexShrink: 0 }}>
          <button
            className="nb"
            style={{
              padding: "4px 6px",
              background: doc.starred ? theme.ac + "1F" : theme.sa,
              color: doc.starred ? theme.ac : theme.tm,
              border: `1px solid ${doc.starred ? theme.ac + "55" : theme.bd}`,
              borderRadius: theme.r6,
            }}
            title={doc.starred ? "Unstar" : "Star"}
            onClick={e => {
              e.stopPropagation();
              onStar(doc.id);
            }}
          >
            <I.Star
              size={11}
              fill={doc.starred ? theme.ac : "none"}
              color={doc.starred ? theme.ac : theme.tm}
            />
          </button>

          <div ref={mRef} style={{ position: "relative" }}>
            <button
              className="nb"
              style={{
                padding: "4px 6px",
                background: theme.sa,
                color: theme.ts,
                border: `1px solid ${theme.bd}`,
                borderRadius: theme.r6,
              }}
              onClick={e => {
                e.stopPropagation();
                setMenu(v => !v);
              }}
            >
              <I.Dots size={11} color={theme.ts} />
            </button>
            {menu && (
              <div className="nmenu" onClick={e => e.stopPropagation()}>
                <div
                  className="nmi"
                  onClick={() => {
                    setMenu(false);
                    setDraft(doc.title);
                    setRen(true);
                  }}
                >
                  <I.Pencil size={12} /> Rename
                </div>
                <div
                  className="nmi"
                  onClick={() => {
                    setMenu(false);
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
                    setMenu(false);
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
  const def = registryU._app(doc.type);
  const c = doc.appColor || getAppColor(activeWS.id, doc.type, def.dc);
  const soft = c + (theme.dk ? "1A" : "22");

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
      <AppChip appId={doc.type} size={30} colorOverride={c} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: theme.tx,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {doc.title}
        </div>
        <div style={{ fontSize: 10, color: theme.tm, marginTop: 1 }}>
          {utils._rel(doc.modified)}
        </div>
      </div>
      <span
        className="nbadge"
        style={{ background: soft, color: c, flexShrink: 0 }}
      >
        {def.label}
      </span>
      <button
        className="nb ni"
        style={{
          color: doc.starred ? theme.ac : theme.tm,
          padding: 3,
          flexShrink: 0,
        }}
        onClick={e => {
          e.stopPropagation();
          onStar(doc.id);
        }}
      >
        <I.Star
          size={11}
          fill={doc.starred ? theme.ac : "none"}
          color={doc.starred ? theme.ac : theme.tm}
        />
      </button>
      <button
        className="nb ni"
        style={{ padding: 3, flexShrink: 0 }}
        onClick={e => {
          e.stopPropagation();
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
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("modified");
  const [vm, setVm] = useState("grid");
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
  // can actually fit on screen at C.GRID_MIN_CARD_PX per card.
  const gridRef = useRef(null);
  const [maxCols, setMaxCols] = useState(6);
  useEffect(() => {
    const el = gridRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setMaxCols(Math.max(2, Math.min(8, Math.floor((w + 9) / (C.GRID_MIN_CARD_PX + 9)))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [vm]);

  const [savedCols, setSavedCols] = useState(() => {
    if (typeof window === "undefined") return 0;
    const v = Number(window.localStorage.getItem(C.GRID_COLS_KEY));
    return Number.isFinite(v) && v >= 2 ? v : 0;
  });
  const defaultCols = Math.max(2, Math.round((2 + maxCols) / 2));
  const cols = savedCols ? Math.min(Math.max(savedCols, 2), maxCols) : defaultCols;
  const [sliderPos, setSliderPos] = useState(cols);
  useEffect(() => {
    setSliderPos(p => Math.min(Math.max(p, 2), maxCols));
  }, [maxCols]);

  const visible = useMemo(() => {
    let docs = utils._filterV(activeWS.docs, view);
    if (favOnly) docs = docs.filter(d => d.starred);
    return utils._sortD(utils._filterQ(docs, q), sort);
  }, [activeWS.docs, view, q, sort, favOnly]);

  // Quick-start tiles: all apps on home, just the current app on a filtered view.
  // Calendar is a singleton and lives outside the doc-creation flow.
  let qt;
  if (view === "home") {
    qt = registry.APPS.filter(a => a.id !== "calendar").map(a => a.id);
  } else if (registry.APPS.map(a => a.id).includes(view)) {
    qt = [view];
  } else {
    qt = null;
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "26px 22px 48px",
        maxWidth: 1200,
        width: "100%",
        margin: "0 auto",
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
              color: theme.tx,
              letterSpacing: "-0.03em",
            }}
          >
            {utils._vtitle(view)}
          </h1>
        </div>
      )}

      {qt && !isMobile && (
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
              color: theme.tm,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Quick start
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {qt.map(type => {
              const def = registryU._app(type);
              const c = getAppColor(activeWS.id, type, def.dc);
              return (
                <button
                  key={type}
                  onClick={() => onNewDoc(type)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 13px",
                    borderRadius: theme.r14,
                    background: c + (theme.dk ? "1A" : "22"),
                    border: `1px solid ${c}22`,
                    cursor: "pointer",
                    transition: theme.tr,
                    fontFamily: theme.fn,
                    outline: "none",
                    color: theme.tx,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = c + "55";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = c + "22";
                  }}
                >
                  <def.Icon size={13} color={c} /> New {def.label}
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
        <span style={{ fontSize: 10, color: theme.tm }}>
          {visible.length} doc{visible.length !== 1 ? "s" : ""}
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          {[["grid", I.Grid], ["list", I.List]].map(([m, Ico]) => (
            <button
              key={m}
              className="nb ni"
              style={{
                color: vm === m ? theme.tx : theme.tm,
                background: vm === m ? theme.sa : "transparent",
              }}
              onClick={() => setVm(m)}
            >
              <Ico size={13} />
            </button>
          ))}
        </div>
        {vm === "grid" && !isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="range"
              min={2}
              max={maxCols}
              step="any"
              value={sliderPos}
              title={`${cols} per row`}
              onChange={e => {
                const v = Number(e.target.value);
                setSliderPos(v);
                const snapped = Math.min(Math.max(Math.round(v), 2), maxCols);
                setSavedCols(snapped);
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(C.GRID_COLS_KEY, String(snapped));
                }
              }}
              style={{ width: 115, accentColor: theme.ac, cursor: "pointer" }}
            />
          </div>
        )}
        <button
          className="nb"
          title={favOnly ? "Show all" : "Show favorites only"}
          aria-pressed={favOnly}
          onClick={() => setFavOnly(v => !v)}
          style={{
            padding: "6px 10px",
            fontSize: 11,
            fontWeight: 600,
            background: favOnly ? theme.ac + "1F" : theme.surface,
            color: favOnly ? theme.ac : theme.ts,
            border: `1px solid ${favOnly ? theme.ac + "55" : theme.bd}`,
            borderRadius: theme.r10,
          }}
        >
          <I.Star size={11} fill={favOnly ? theme.ac : "none"} color={favOnly ? theme.ac : theme.ts} />
          Favorites
        </button>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          style={{
            background: theme.surface,
            border: `1px solid ${theme.bd}`,
            color: theme.ts,
            fontFamily: theme.fn,
            fontSize: 11,
            borderRadius: theme.r10,
            padding: "6px 9px",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="modified">Last modified</option>
          <option value="name">Name A→Z</option>
          <option value="type">App type</option>
        </select>
        {isMobile && !searchOpen ? (
          <button
            className="nb ni"
            onClick={() => setSearchOpen(true)}
            title="Search"
            style={{
              marginLeft: "auto",
              padding: 7,
              border: `1px solid ${theme.bd}`,
              borderRadius: theme.r10,
              background: theme.surface,
            }}
          >
            <I.Search size={13} />
          </button>
        ) : (
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
              <I.Search size={11} color={theme.tm} />
            </div>
            <input
              ref={searchRef}
              className="ninput"
              style={{ paddingLeft: 27, paddingRight: isMobile ? 28 : 12, fontSize: 12 }}
              placeholder="Search…"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Escape" && isMobile) {
                  setQ("");
                  setSearchOpen(false);
                }
              }}
            />
            {isMobile && (
              <button
                onClick={() => {
                  setQ("");
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
                  color: theme.tm,
                  display: "flex",
                  padding: 4,
                  borderRadius: theme.r6,
                }}
              >
                <I.X size={11} />
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
              borderRadius: theme.r20,
              background: theme.sa,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 13px",
            }}
          >
            <I.File size={20} color={theme.tm} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: theme.ts, marginBottom: 5 }}>
            {q ? `No results for "${q}"` : "No documents yet"}
          </p>
          <p style={{ fontSize: 12, color: theme.tm, marginBottom: 18 }}>
            {q ? "Try a different search term" : "Create your first document to get started"}
          </p>
          {!q && (
            <button
              className="nb np"
              onClick={() => onNewDoc(registry.APPS.some(a => a.id === view) ? view : undefined)}
            >
              <I.Plus size={13} /> New document
            </button>
          )}
        </div>
      )}

      {visible.length > 0 && vm === "grid" && (
        <TileGrid
          gridRef={gridRef}
          cols={isMobile ? undefined : cols}
          min={C.GRID_MIN_CARD_PX}
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

      {visible.length > 0 && vm === "list" && (
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

// ── App catalogue screen ────────────────────────────────────────────────────

export const AppCatalogueScreen = ({ onNewDoc, getAppColor, activeWS }) => {
  const theme = useT();
  const cats = [...new Set(registry.APPS.map(a => a.cat))];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "26px 22px 48px" }}>
      <div style={{ marginBottom: 24, animation: "fadeUp 0.3s ease both" }}>
        <h1
          style={{
            fontSize: 23,
            fontWeight: 800,
            color: theme.tx,
            letterSpacing: "-0.03em",
            marginBottom: 4,
          }}
        >
          App catalogue
        </h1>
        <p style={{ fontSize: 12, color: theme.ts }}>
          Click any tile to create a new document instantly.
        </p>
      </div>

      {cats.map((cat, ci) => (
        <div
          key={cat}
          style={{
            marginBottom: 28,
            animation: `fadeUp 0.3s ease ${ci * 0.06}s both`,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: theme.tm,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            {cat}
          </div>
          <TileGrid min={210}>
            {registry.APPS.filter(a => a.cat === cat).map(app => {
              const c = getAppColor(activeWS.id, app.id, app.dc);
              const soft = c + (theme.dk ? "1A" : "22");
              return (
                <div
                  key={app.id}
                  onClick={() => onNewDoc(app.id)}
                  style={{
                    padding: 15,
                    borderRadius: theme.r14,
                    border: `1px solid ${theme.bd}`,
                    background: theme.surface,
                    cursor: "pointer",
                    transition: theme.tr,
                    position: "relative",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = c + "44";
                    e.currentTarget.style.background = theme.sh;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = theme.bd;
                    e.currentTarget.style.background = theme.surface;
                  }}
                >
                  <span
                    className="nbadge"
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      background: "rgba(59,181,128,0.15)",
                      color: "#3BB580",
                    }}
                  >
                    Live
                  </span>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: theme.r10,
                      background: soft,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 10,
                    }}
                  >
                    <app.Icon size={18} color={c} />
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: theme.tx,
                      marginBottom: 3,
                    }}
                  >
                    {app.label}
                  </div>
                  <div style={{ fontSize: 11, color: theme.ts, lineHeight: 1.5 }}>
                    {app.desc}
                  </div>
                </div>
              );
            })}
          </TileGrid>
        </div>
      ))}
    </div>
  );
};
