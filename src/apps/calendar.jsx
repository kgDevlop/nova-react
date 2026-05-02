import React, { useState, useEffect, useRef } from "react";
import { I } from "../shared/icons";
import { AppsSidebar, AppsSidebarSection, DefaultSections } from "../shared/apps_sidebar";
import { utils, registry as registryU } from "../shared/_utils";
import { calendar as calendarConst } from "../shared/_constants";

// Build a 6×7 month grid (null-padded) so the layout never reflows.
const buildMonthCells = (year, month) => {
  const firstDow = new Date(year, month, 1).getDay();
  const daysIn   = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: 42 }, (_, i) => {
    const d = i - firstDow + 1;
    return d < 1 || d > daysIn ? null : d;
  });
};

const _ymd = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const _parseEvents = (content) => {
  try {
    const p = JSON.parse(content || "[]");
    if (!Array.isArray(p)) return [];
    return p
      .filter(e => e && typeof e.id === "string" && typeof e.date === "string")
      .map(e => ({
        id:     e.id,
        calId:  typeof e.calId === "string" ? e.calId : calendarConst.CALENDARS[0].id,
        title:  typeof e.title === "string" ? e.title : "",
        date:   e.date,
        time:   typeof e.time === "string" ? e.time : "",
        notes:  typeof e.notes === "string" ? e.notes : "",
        links:  Array.isArray(e.links) ? e.links.filter(x => typeof x === "string") : [],
      }));
  } catch {
    return [];
  }
};

export const CalendarEditor = ({ appColor, doc, t: theme, onContentChange, registerActions, isMobile, onBack, saveStatus, activeWS, onTitleChange }) => {
  const now = new Date();
  const [view,    setView]    = useState("month");
  const [cursor,  setCursor]  = useState(now);
  const [visible, setVisible] = useState(() => new Set(calendarConst.CALENDARS.map(c => c.id)));
  const [events,  setEvents]  = useState(() => _parseEvents(doc.content));
  const [editing, setEditing] = useState(null); // { id?, calId, title, date, time }
  const initialMount = useRef(true);

  const year  = cursor.getFullYear();
  const month = cursor.getMonth();

  // Reload when switching documents.
  useEffect(() => {
    setEvents(_parseEvents(doc.content));
    initialMount.current = true;
  }, [doc.id]);

  // Persist on change.
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    onContentChange?.(JSON.stringify(events));
  }, [events]); // eslint-disable-line

  const shiftMonth = dir => {
    setCursor(c => {
      const d = new Date(c);
      d.setMonth(d.getMonth() + dir);
      return d;
    });
  };

  const toggleCal = id => {
    setVisible(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const isToday = day =>
    day === now.getDate() && month === now.getMonth() && year === now.getFullYear();

  const openNew = (date) => setEditing({
    calId: calendarConst.CALENDARS[0].id, title: "", date, time: "", notes: "", links: [],
  });
  const openEdit = (ev) => setEditing({ ...ev });
  const closeEditor = () => setEditing(null);

  const saveEvent = () => {
    const t = editing.title.trim();
    if (!t) return closeEditor();
    setEvents(curr => {
      if (editing.id) {
        return curr.map(e => e.id === editing.id ? { ...editing, title: t } : e);
      }
      return [...curr, { ...editing, title: t, id: utils._elId() }];
    });
    closeEditor();
  };

  const deleteEvent = () => {
    if (!editing?.id) return closeEditor();
    setEvents(curr => curr.filter(e => e.id !== editing.id));
    closeEditor();
  };

  // Wire toolbar buttons (today/prev/next/view); "new" is a no-op for now.
  useEffect(() => {
    registerActions?.((id, val) => {
      if (id === "today")       setCursor(new Date());
      if (id === "prev")        shiftMonth(-1);
      if (id === "next")        shiftMonth(1);
      if (id === "view" && val) setView(val);
    });
  }, []); // eslint-disable-line

  // Index events by date for the visible month, filtered by enabled calendars.
  const eventsByDate = events.reduce((acc, e) => {
    if (!visible.has(e.calId)) return acc;
    (acc[e.date] = acc[e.date] || []).push(e);
    return acc;
  }, {});
  Object.values(eventsByDate).forEach(list =>
    list.sort((a, b) => (a.time || "").localeCompare(b.time || "")));

  const calColor = id => calendarConst.CALENDARS.find(c => c.id === id)?.color || theme.ac;

  // ── Mini month (sidebar) ────────────────────────────────────────────────

  const renderMiniMonth = () => {
    const cells = buildMonthCells(year, month);
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1 }}>
        {calendarConst.DAYS_MINI.map((d, i) => (
          <div
            key={i}
            style={{
              fontSize: 9,
              color: theme.tm,
              textAlign: "center",
              fontWeight: 600,
              padding: "2px 0",
            }}
          >
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          const today = d != null && isToday(d);
          return (
            <div
              key={i}
              style={{
                height: 30,
                fontSize: 10,
                fontWeight: today ? 700 : 500,
                color: today ? "#fff" : d ? theme.tx : "transparent",
                background: today ? appColor : "transparent",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {d || ""}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Month grid (main view) ──────────────────────────────────────────────

  const renderMonthGrid = () => {
    const cells = buildMonthCells(year, month);
    return (
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gap: 1,
            background: theme.bd,
            border: `1px solid ${theme.bd}`,
          }}
        >
          {calendarConst.DAYS.map(d => (
            <div
              key={d}
              style={{
                background: theme.surface,
                padding: "6px 0",
                textAlign: "center",
                fontSize: 11,
                fontWeight: 600,
                color: theme.ts,
              }}
            >
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            const dateStr = day ? _ymd(year, month, day) : null;
            const dayEvents = dateStr ? (eventsByDate[dateStr] || []) : [];
            return (
              <div
                key={i}
                onClick={() => dateStr && openNew(dateStr)}
                style={{
                  background: theme.surface,
                  minHeight: calendarConst.CELL_MIN_H,
                  padding: 5,
                  cursor: day ? "pointer" : "default",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                {day && (
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: isToday(day) ? 700 : 500,
                      color: isToday(day) ? "#fff" : theme.ts,
                      width: calendarConst.TODAY_BADGE,
                      height: calendarConst.TODAY_BADGE,
                      borderRadius: "50%",
                      background: isToday(day) ? appColor : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {day}
                  </div>
                )}
                {dayEvents.map(ev => {
                  const color = calColor(ev.calId);
                  return (
                    <button
                      key={ev.id}
                      onClick={e => { e.stopPropagation(); openEdit(ev); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 5px",
                        background: `${color}22`,
                        border: "none",
                        borderLeft: `3px solid ${color}`,
                        borderRadius: 3,
                        cursor: "pointer",
                        fontSize: 10,
                        fontWeight: 600,
                        color: theme.tx,
                        fontFamily: theme.fn,
                        textAlign: "left",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {ev.time && <span style={{ color: theme.tm, fontWeight: 500 }}>{ev.time}</span>}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Event editor modal ──────────────────────────────────────────────────

  const renderEditor = () => {
    if (!editing) return null;
    const linkableDocs = (activeWS?.docs || []).filter(
      d => d.id !== doc.id && !editing.links.includes(d.id)
    );
    const linkedDocs = editing.links
      .map(id => (activeWS?.docs || []).find(d => d.id === id))
      .filter(Boolean);
    return (
      <div
        onClick={closeEditor}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: theme.surface,
            border: `1px solid ${theme.bd}`,
            borderRadius: theme.r6,
            padding: 16,
            width: 340,
            maxHeight: "85vh",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            fontFamily: theme.fn,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={{ flex: 1, fontSize: 13, fontWeight: 700, color: theme.tx, margin: 0 }}>
              {editing.id ? "Edit event" : "New event"}
            </h3>
            <button className="nb ni" style={{ padding: 4 }} onClick={closeEditor}>
              <I.X size={12} />
            </button>
          </div>

          <input
            autoFocus
            type="text"
            placeholder="Event title"
            value={editing.title}
            onChange={e => setEditing(s => ({ ...s, title: e.target.value }))}
            onKeyDown={e => { if (e.key === "Enter") saveEvent(); }}
            style={{
              background: theme.sa,
              border: `1px solid ${theme.bd}`,
              borderRadius: theme.r6,
              padding: "6px 8px",
              color: theme.tx,
              fontFamily: theme.fn,
              fontSize: 12,
              outline: "none",
            }}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="date"
              value={editing.date}
              onChange={e => setEditing(s => ({ ...s, date: e.target.value }))}
              style={{
                flex: 1,
                background: theme.sa,
                border: `1px solid ${theme.bd}`,
                borderRadius: theme.r6,
                padding: "6px 8px",
                color: theme.tx,
                fontFamily: theme.fn,
                fontSize: 12,
                outline: "none",
              }}
            />
            <input
              type="time"
              value={editing.time}
              onChange={e => setEditing(s => ({ ...s, time: e.target.value }))}
              style={{
                width: 110,
                background: theme.sa,
                border: `1px solid ${theme.bd}`,
                borderRadius: theme.r6,
                padding: "6px 8px",
                color: theme.tx,
                fontFamily: theme.fn,
                fontSize: 12,
                outline: "none",
              }}
            />
          </div>

          <select
            value={editing.calId}
            onChange={e => setEditing(s => ({ ...s, calId: e.target.value }))}
            style={{
              background: theme.sa,
              border: `1px solid ${theme.bd}`,
              borderRadius: theme.r6,
              padding: "6px 13px 6px 8px",
              color: theme.tx,
              fontFamily: theme.fn,
              fontSize: 12,
              outline: "none",
            }}
          >
            {calendarConst.CALENDARS.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <textarea
            placeholder="Notes (optional)"
            value={editing.notes}
            onChange={e => setEditing(s => ({ ...s, notes: e.target.value }))}
            rows={3}
            style={{
              background: theme.sa,
              border: `1px solid ${theme.bd}`,
              borderRadius: theme.r6,
              padding: "6px 8px",
              color: theme.tx,
              fontFamily: theme.fn,
              fontSize: 12,
              outline: "none",
              resize: "vertical",
              minHeight: 60,
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 10, color: theme.tm, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Linked documents
            </span>
            {linkedDocs.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {linkedDocs.map(d => {
                  const def = registryU._app(d.type);
                  return (
                    <span
                      key={d.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: theme.sa,
                        border: `1px solid ${theme.bd}`,
                        borderRadius: theme.r6,
                        padding: "3px 4px 3px 7px",
                        fontSize: 11,
                        color: theme.tx,
                        maxWidth: 180,
                      }}
                    >
                      <def.Icon size={10} color={def.dc} />
                      <span style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                        {d.title}
                      </span>
                      <button
                        className="nb ni"
                        onClick={() => setEditing(s => ({ ...s, links: s.links.filter(id => id !== d.id) }))}
                        style={{ padding: 1 }}
                        title="Remove link"
                      >
                        <I.X size={9} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <select
              value=""
              onChange={e => {
                const id = e.target.value;
                if (!id) return;
                setEditing(s => ({ ...s, links: [...s.links, id] }));
              }}
              disabled={linkableDocs.length === 0}
              style={{
                background: theme.sa,
                border: `1px solid ${theme.bd}`,
                borderRadius: theme.r6,
                padding: "6px 13px 6px 8px",
                color: theme.ts,
                fontFamily: theme.fn,
                fontSize: 11,
                outline: "none",
                opacity: linkableDocs.length === 0 ? 0.5 : 1,
              }}
            >
              <option value="">
                {linkableDocs.length === 0 ? "No documents to link" : "+ Link a document…"}
              </option>
              {linkableDocs.map(d => {
                const def = registryU._app(d.type);
                return (
                  <option key={d.id} value={d.id}>
                    {def.label} — {d.title}
                  </option>
                );
              })}
            </select>
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {editing.id && (
              <button
                className="nb ni"
                onClick={deleteEvent}
                style={{ fontSize: 11, padding: "5px 10px", color: "#F87171" }}
              >
                <I.Trash size={11} /> Delete
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button
              className="nb ni"
              onClick={closeEditor}
              style={{ fontSize: 11, padding: "5px 10px" }}
            >
              Cancel
            </button>
            <button
              className="nb np"
              onClick={saveEvent}
              style={{ fontSize: 11, padding: "5px 10px" }}
            >
              <I.Check size={11} /> Save
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden", minHeight: 0, position: "relative" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* View header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderBottom: `1px solid ${theme.bd}`,
            flexShrink: 0,
          }}
        >
          <h2 style={{ fontSize: 17, fontWeight: 800, color: theme.tx, marginRight: 6, minWidth: 170 }}>
            {calendarConst.MONTHS[month]} {year}
          </h2>
          <button className="nb ni" style={{ padding: 5 }} onClick={() => shiftMonth(-1)}>
            <I.ChevLeft size={13} />
          </button>
          <button className="nb ni" style={{ padding: 5 }} onClick={() => shiftMonth(1)}>
            <I.ChevRight size={13} />
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 2, background: theme.sa, borderRadius: theme.r6, padding: 2 }}>
            {calendarConst.VIEWS.map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "4px 12px",
                  borderRadius: theme.r6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: view === v ? 700 : 500,
                  background: view === v ? theme.surface : "transparent",
                  color: view === v ? theme.tx : theme.ts,
                  fontFamily: theme.fn,
                  textTransform: "capitalize",
                }}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            className="nb ng"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={() => setCursor(new Date())}
          >
            Today
          </button>
          <button
            className="nb np"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={() => openNew(_ymd(year, month, now.getDate()))}
          >
            <I.Plus size={11} /> New event
          </button>
        </div>

        {renderMonthGrid()}
      </div>

      {/* Right sidebar */}
      <AppsSidebar
        doc={doc}
        appColor={appColor}
        mobile={isMobile}
        onBack={onBack}
        saveStatus={saveStatus}
        activeWS={activeWS}
        onTitleChange={onTitleChange}
      >
        <AppsSidebarSection title="My Calendars" icon={I.Calendar}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {calendarConst.CALENDARS.map(c => {
              const on = visible.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCal(c.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "5px 4px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: theme.r6,
                    fontFamily: theme.fn,
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      border: `1.5px solid ${on ? c.color : theme.bs}`,
                      background: on ? c.color : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {on && <I.Check size={9} color="#fff" />}
                  </span>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: c.color,
                      flexShrink: 0,
                      opacity: on ? 1 : 0.4,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: on ? theme.tx : theme.ts,
                      fontWeight: 500,
                      textAlign: "left",
                      flex: 1,
                    }}
                  >
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        </AppsSidebarSection>

        <AppsSidebarSection title={`${calendarConst.MONTHS[month]} ${year}`} icon={I.Calendar}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <div style={{ flex: 1, fontSize: 11, color: theme.ts, fontWeight: 600 }}>
              Jump to date
            </div>
            <button className="nb ni" style={{ padding: 3 }} onClick={() => shiftMonth(-1)}>
              <I.ChevLeft size={11} />
            </button>
            <button className="nb ni" style={{ padding: 3 }} onClick={() => shiftMonth(1)}>
              <I.ChevRight size={11} />
            </button>
          </div>
          {renderMiniMonth()}
        </AppsSidebarSection>

        <div style={{ marginTop: "auto" }}>
          <DefaultSections doc={doc} defaultOpen={false} />
        </div>
      </AppsSidebar>

      {renderEditor()}
    </div>
  );
};
