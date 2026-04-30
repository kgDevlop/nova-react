import React, { useState, useEffect, useMemo } from "react";
import { I } from "../shared/icons";
import { _elId } from "../shared/utils";
import { AppsSidebar, AppsSidebarSection, DefaultSections } from "../shared/apps_sidebar";

// Static calendar list (cannot be added/removed). Matches the categories shown
// in the reference layout; colours are pulled from nova's palette.
const CALENDARS = [
  { id: "work",    name: "Work",              color: "#4A8FE8" },
  { id: "ent",     name: "Entertainment",     color: "#EF4444" },
  { id: "agenda",  name: "Agenda",            color: "#F59E0B" },
  { id: "appts",   name: "Appointments",      color: "#3BB580" },
  { id: "proj",    name: "Personal Projects", color: "#A87BE8" },
  { id: "health",  name: "Healthy",           color: "#FACC15" },
];

const CAL_BY_ID = Object.fromEntries(CALENDARS.map(c => [c.id, c]));

const DAY_NAMES      = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_MINI = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES    = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const VIEWS = ["day", "week", "month", "year"];

// Layout constants
const MONTH_CELL_MIN_HEIGHT = 90;
const MONTH_CELL_EVENT_LIMIT = 3;
const TODAY_BADGE_SIZE = 22;
const HOUR_ROW_HEIGHT = 44;
const TIME_COL_WIDTH = 56;
const DAY_START_HOUR = 6;
const DAY_END_HOUR   = 22;

// ── Date helpers ──────────────────────────────────────────────────────────

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfWeek = d => {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - out.getDay());
  return out;
};

const addDays = (d, n) => {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
};

// ──────────────────────────────────────────────────────────────────────────

export const CalendarEditor = ({ appColor, doc, t: theme, onContentChange, registerActions }) => {
  const now = new Date();

  // Seed events from saved doc content; fall back to a small demo set so a
  // fresh calendar isn't empty on first open.
  const initEvents = () => {
    try {
      const parsed = JSON.parse(doc.content || "{}");
      if (parsed.events) {
        return parsed.events;
      }
    } catch {
      // Ignore parse errors — drop through to the demo seed.
    }
    const buildIso = (offset, h = 10, m = 0) => {
      const dt = new Date(now);
      dt.setDate(dt.getDate() + offset);
      dt.setHours(h, m, 0, 0);
      return dt.toISOString();
    };
    return [
      { id: "e1", title: "Morning planning", start: buildIso(0, 9, 30),  end: buildIso(0, 10, 15), calendarId: "work",   notes: "" },
      { id: "e2", title: "Product review",   start: buildIso(2, 14),     end: buildIso(2, 15),     calendarId: "work",   notes: "Roadmap Q2" },
      { id: "e3", title: "Dentist",          start: buildIso(3, 11),     end: buildIso(3, 11, 45), calendarId: "appts",  notes: "" },
      { id: "e4", title: "Project planning", start: buildIso(-1, 10),    end: buildIso(-1, 12),    calendarId: "proj",   notes: "" },
      { id: "e5", title: "Conference talk",  start: buildIso(7, 16),     end: buildIso(7, 17),     calendarId: "ent",    notes: "Quarterly" },
      { id: "e6", title: "Design review",    start: buildIso(9, 13),     end: buildIso(9, 14),     calendarId: "agenda", notes: "" },
      { id: "e7", title: "Run",              start: buildIso(1, 7),      end: buildIso(1, 7, 30),  calendarId: "health", notes: "" },
    ];
  };

  const [events, setEvents] = useState(initEvents);
  const [view, setView]     = useState("month");
  // `cursor` is the focal date for the current view (any day inside the
  // displayed month/week/day; year-view uses just the year component).
  const [cursor, setCursor] = useState(now);
  const [visibleCals, setVisibleCals] = useState(() => new Set(CALENDARS.map(c => c.id)));
  // null | { mode: "create" } | { mode: "edit", ev }
  const [modal, setModal] = useState(null);
  const [form,  setForm]  = useState({
    title: "",
    start: "",
    end: "",
    calendarId: CALENDARS[0].id,
    notes: "",
  });

  // ── Persistence ─────────────────────────────────────────────────────────

  useEffect(() => {
    onContentChange(JSON.stringify({ events }));
  }, [events]); // eslint-disable-line

  // ── Toolbar wiring ──────────────────────────────────────────────────────

  useEffect(() => {
    registerActions((id, val) => {
      if (id === "new")    openCreate(new Date());
      if (id === "today")  setCursor(new Date());
      if (id === "view" && val) setView(val);
      if (id === "prev")   shiftCursor(-1);
      if (id === "next")   shiftCursor(1);
    });
  }, [view]); // eslint-disable-line

  // ── Formatting helpers ──────────────────────────────────────────────────

  const fmtTime = iso => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const fmtDate = iso => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const isoLocal = (date, h = 9, m = 0) => {
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const colorOf = ev => CAL_BY_ID[ev.calendarId]?.color || appColor;

  // Filter: only events whose calendar is currently visible.
  const visibleEvents = useMemo(
    () => events.filter(ev => visibleCals.has(ev.calendarId)),
    [events, visibleCals],
  );

  const eventsOnDay = date => {
    const ds = date.toDateString();
    return visibleEvents
      .filter(ev => new Date(ev.start).toDateString() === ds)
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  };

  // ── Cursor navigation ───────────────────────────────────────────────────

  const shiftCursor = dir => {
    setCursor(c => {
      const d = new Date(c);
      if (view === "day")        d.setDate(d.getDate() + dir);
      else if (view === "week")  d.setDate(d.getDate() + dir * 7);
      else if (view === "month") d.setMonth(d.getMonth() + dir);
      else if (view === "year")  d.setFullYear(d.getFullYear() + dir);
      return d;
    });
  };

  // ── Modal / event mutators ──────────────────────────────────────────────

  const openCreate = (date, hour) => {
    const startH = hour ?? 9;
    setForm({
      title: "",
      start: isoLocal(date, startH),
      end:   isoLocal(date, startH + 1),
      calendarId: CALENDARS[0].id,
      notes: "",
    });
    setModal({ mode: "create" });
  };

  const openEdit = (ev, e) => {
    e?.stopPropagation();
    setForm({
      title: ev.title,
      start: ev.start,
      end:   ev.end,
      calendarId: ev.calendarId,
      notes: ev.notes || "",
    });
    setModal({ mode: "edit", ev });
  };

  const saveEvent = () => {
    if (!form.title.trim()) return;
    if (modal.mode === "create") {
      setEvents(es => [...es, { ...form, id: _elId() }]);
    } else {
      setEvents(es => es.map(e => (e.id === modal.ev.id ? { ...form, id: e.id } : e)));
    }
    setModal(null);
  };

  const deleteEvent = id => {
    setEvents(es => es.filter(e => e.id !== id));
    setModal(null);
  };

  const toggleCalendar = id => {
    setVisibleCals(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Header (above the view content) ─────────────────────────────────────

  const headerTitle = () => {
    if (view === "year")  return String(cursor.getFullYear());
    if (view === "month") return `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view === "week") {
      const s = startOfWeek(cursor);
      const e = addDays(s, 6);
      const sM = MONTH_NAMES[s.getMonth()].slice(0, 3);
      const eM = MONTH_NAMES[e.getMonth()].slice(0, 3);
      if (s.getMonth() === e.getMonth()) {
        return `${sM} ${s.getDate()} – ${e.getDate()}, ${e.getFullYear()}`;
      }
      return `${sM} ${s.getDate()} – ${eM} ${e.getDate()}, ${e.getFullYear()}`;
    }
    return cursor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  const ViewHeader = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${theme.bd}`, flexShrink: 0 }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: theme.tx, marginRight: 6 }}>
        {headerTitle()}
      </h2>
      <button className="nb ni" style={{ padding: 5 }} onClick={() => shiftCursor(-1)}>
        <I.ChevLeft size={13} />
      </button>
      <button className="nb ni" style={{ padding: 5 }} onClick={() => shiftCursor(1)}>
        <I.ChevRight size={13} />
      </button>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 2, background: theme.sa, borderRadius: theme.r6, padding: 2 }}>
        {VIEWS.map(v => (
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
        onClick={() => openCreate(new Date(cursor))}
      >
        <I.Plus size={11} /> New event
      </button>
    </div>
  );

  // ── Month view ──────────────────────────────────────────────────────────

  const renderMonth = () => {
    const year  = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    // Pad to a full 6-row grid so the layout doesn't reflow as months change.
    const TOTAL_CELLS = 42;
    const cells = Array.from({ length: TOTAL_CELLS }, (_, i) => {
      const dayNum = i - first + 1;
      if (dayNum < 1 || dayNum > total) return null;
      return dayNum;
    });

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
          {DAY_NAMES.map(d => (
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
            const isToday =
              day === now.getDate() &&
              month === now.getMonth() &&
              year === now.getFullYear();
            const dayDate = day ? new Date(year, month, day) : null;
            const evs = dayDate ? eventsOnDay(dayDate) : [];
            return (
              <div
                key={i}
                style={{
                  background: theme.surface,
                  minHeight: MONTH_CELL_MIN_HEIGHT,
                  padding: 5,
                  cursor: day ? "pointer" : "default",
                }}
                onClick={() => day && openCreate(new Date(year, month, day))}
                onMouseEnter={e => { if (day) e.currentTarget.style.background = theme.sh; }}
                onMouseLeave={e => { e.currentTarget.style.background = theme.surface; }}
              >
                {day && (
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: isToday ? 700 : 500,
                      color: isToday ? "#fff" : theme.ts,
                      width: TODAY_BADGE_SIZE,
                      height: TODAY_BADGE_SIZE,
                      borderRadius: "50%",
                      background: isToday ? appColor : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 3,
                    }}
                  >
                    {day}
                  </div>
                )}
                {evs.slice(0, MONTH_CELL_EVENT_LIMIT).map(ev => {
                  const c = colorOf(ev);
                  return (
                    <div
                      key={ev.id}
                      onClick={e => openEdit(ev, e)}
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: theme.tx,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 4px",
                        marginBottom: 2,
                        borderRadius: 3,
                        cursor: "pointer",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = theme.sa; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c, flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{ev.title}</span>
                      <span style={{ color: theme.tm, fontSize: 9, fontWeight: 500 }}>{fmtTime(ev.start)}</span>
                    </div>
                  );
                })}
                {evs.length > MONTH_CELL_EVENT_LIMIT && (
                  <div style={{ fontSize: 9, color: theme.tm, padding: "0 4px" }}>
                    +{evs.length - MONTH_CELL_EVENT_LIMIT} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Week view ───────────────────────────────────────────────────────────

  const TimeColumn = () => (
    <div style={{ width: TIME_COL_WIDTH, flexShrink: 0, borderRight: `1px solid ${theme.bd}` }}>
      <div style={{ height: 36, borderBottom: `1px solid ${theme.bd}` }} />
      {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => {
        const h = DAY_START_HOUR + i;
        const label = h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM`;
        return (
          <div
            key={h}
            style={{
              height: HOUR_ROW_HEIGHT,
              fontSize: 10,
              color: theme.tm,
              textAlign: "right",
              padding: "2px 8px 0 0",
              borderBottom: `1px solid ${theme.bd}`,
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );

  // Position an event block within a day column. Returns { top, height } in px.
  const eventGeom = ev => {
    const start = new Date(ev.start);
    const end   = new Date(ev.end);
    const startMins = start.getHours() * 60 + start.getMinutes() - DAY_START_HOUR * 60;
    const durMins   = Math.max(15, (end - start) / 60000);
    return {
      top:    (startMins / 60) * HOUR_ROW_HEIGHT,
      height: (durMins / 60) * HOUR_ROW_HEIGHT - 2,
    };
  };

  const DayColumn = ({ date, showHeader = true, headerLabel }) => {
    const evs = eventsOnDay(date);
    const isToday = sameDay(date, now);
    return (
      <div style={{ flex: 1, minWidth: 0, borderRight: `1px solid ${theme.bd}`, position: "relative", display: "flex", flexDirection: "column" }}>
        {showHeader && (
          <div
            style={{
              height: 36,
              borderBottom: `1px solid ${theme.bd}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 600,
              color: theme.ts,
              flexShrink: 0,
            }}
          >
            <span>{headerLabel}</span>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: isToday ? appColor : "transparent",
                color: isToday ? "#fff" : theme.tx,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 11,
              }}
            >
              {date.getDate()}
            </span>
          </div>
        )}
        <div style={{ position: "relative", flex: 1 }}>
          {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => {
            const h = DAY_START_HOUR + i;
            return (
              <div
                key={h}
                onClick={() => openCreate(date, h)}
                style={{
                  height: HOUR_ROW_HEIGHT,
                  borderBottom: `1px solid ${theme.bd}`,
                  cursor: "pointer",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = theme.sh; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              />
            );
          })}
          {evs.map(ev => {
            const { top, height } = eventGeom(ev);
            const c = colorOf(ev);
            return (
              <div
                key={ev.id}
                onClick={e => openEdit(ev, e)}
                style={{
                  position: "absolute",
                  top,
                  height,
                  left: 4,
                  right: 4,
                  background: c + "26",
                  borderLeft: `3px solid ${c}`,
                  borderRadius: 4,
                  padding: "3px 6px",
                  cursor: "pointer",
                  overflow: "hidden",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: theme.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ev.title}
                </div>
                <div style={{ fontSize: 10, color: theme.ts }}>
                  {fmtTime(ev.start)} – {fmtTime(ev.end)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeek = () => {
    const weekStart = startOfWeek(cursor);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    return (
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ display: "flex", minWidth: 700 }}>
          <TimeColumn />
          {days.map((d, i) => (
            <DayColumn key={i} date={d} headerLabel={DAY_NAMES[i]} />
          ))}
        </div>
      </div>
    );
  };

  // ── Day view ────────────────────────────────────────────────────────────

  const renderDay = () => (
    <div style={{ flex: 1, overflow: "auto" }}>
      <div style={{ display: "flex" }}>
        <TimeColumn />
        <DayColumn date={cursor} showHeader={false} />
      </div>
    </div>
  );

  // ── Year view ───────────────────────────────────────────────────────────

  const MiniMonth = ({ year, month, onPick, highlightToday = true, compact = false }) => {
    const first = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const cells = Array.from({ length: first }, () => null).concat(
      Array.from({ length: total }, (_, i) => i + 1),
    );
    const cellSize = compact ? 18 : 22;
    const hasEvents = day => {
      if (!day) return false;
      return visibleEvents.some(ev => sameDay(new Date(ev.start), new Date(year, month, day)));
    };
    return (
      <div>
        {!compact && (
          <button
            onClick={() => onPick?.(new Date(year, month, 1))}
            style={{
              background: "transparent",
              border: "none",
              color: theme.tx,
              fontSize: 12,
              fontWeight: 700,
              padding: "0 0 6px",
              cursor: "pointer",
              fontFamily: theme.fn,
            }}
          >
            {MONTH_NAMES[month]}
          </button>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
          {DAY_NAMES_MINI.map((d, i) => (
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
          {cells.map((day, i) => {
            const isToday =
              highlightToday &&
              day === now.getDate() &&
              month === now.getMonth() &&
              year === now.getFullYear();
            const dot = hasEvents(day);
            return (
              <button
                key={i}
                disabled={!day}
                onClick={() => day && onPick?.(new Date(year, month, day))}
                style={{
                  height: cellSize,
                  fontSize: 10,
                  border: "none",
                  background: isToday ? appColor : "transparent",
                  color: isToday ? "#fff" : day ? theme.tx : "transparent",
                  borderRadius: "50%",
                  cursor: day ? "pointer" : "default",
                  fontFamily: theme.fn,
                  fontWeight: isToday ? 700 : 500,
                  position: "relative",
                  padding: 0,
                }}
                onMouseEnter={e => {
                  if (day && !isToday) e.currentTarget.style.background = theme.sa;
                }}
                onMouseLeave={e => {
                  if (!isToday) e.currentTarget.style.background = "transparent";
                }}
              >
                {day || ""}
                {dot && !isToday && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 1,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 3,
                      height: 3,
                      borderRadius: "50%",
                      background: appColor,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderYear = () => {
    const year = cursor.getFullYear();
    return (
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 16,
          }}
        >
          {Array.from({ length: 12 }, (_, m) => (
            <div
              key={m}
              style={{
                background: theme.surface,
                border: `1px solid ${theme.bd}`,
                borderRadius: theme.r10,
                padding: 12,
              }}
            >
              <MiniMonth
                year={year}
                month={m}
                onPick={d => { setCursor(d); setView("month"); }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Sidebar (right side) ────────────────────────────────────────────────

  const renderSidebar = () => (
    <AppsSidebar doc={doc} appColor={appColor}>
      <AppsSidebarSection title="My Calendars" icon={I.Calendar}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {CALENDARS.map(c => {
            const on = visibleCals.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleCalendar(c.id)}
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
                onMouseEnter={e => { e.currentTarget.style.background = theme.sa; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
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
                    transition: theme.tr,
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

      <AppsSidebarSection title={`${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`} icon={I.Calendar}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
          <div style={{ flex: 1, fontSize: 11, color: theme.ts, fontWeight: 600 }}>
            Jump to date
          </div>
          <button
            className="nb ni"
            style={{ padding: 3 }}
            onClick={() => setCursor(c => {
              const d = new Date(c);
              d.setMonth(d.getMonth() - 1);
              return d;
            })}
          >
            <I.ChevLeft size={11} />
          </button>
          <button
            className="nb ni"
            style={{ padding: 3 }}
            onClick={() => setCursor(c => {
              const d = new Date(c);
              d.setMonth(d.getMonth() + 1);
              return d;
            })}
          >
            <I.ChevRight size={11} />
          </button>
        </div>
        <MiniMonth
          year={cursor.getFullYear()}
          month={cursor.getMonth()}
          onPick={d => {
            setCursor(d);
            if (view === "year") setView("month");
          }}
          compact
        />
      </AppsSidebarSection>

      <div style={{ marginTop: "auto" }}>
        <DefaultSections doc={doc} defaultOpen={false} />
      </div>
    </AppsSidebar>
  );

  // ── Render ──────────────────────────────────────────────────────────────

  let viewBody = null;
  if (view === "month") viewBody = renderMonth();
  else if (view === "week")  viewBody = renderWeek();
  else if (view === "day")   viewBody = renderDay();
  else if (view === "year")  viewBody = renderYear();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden", minHeight: 0, position: "relative" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <ViewHeader />
        {viewBody}
      </div>

      {renderSidebar()}

      {modal && (
        <div
          className="novl"
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div className="nmod" style={{ maxWidth: 420 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: theme.tx }}>
                {modal.mode === "create" ? "New event" : "Edit event"}
              </h3>
              <button className="nb ni" onClick={() => setModal(null)}>
                <I.X size={15} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                className="ninput"
                placeholder="Event title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                autoFocus
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 10, color: theme.ts, display: "block", marginBottom: 3 }}>Start</label>
                  <input
                    className="ninput"
                    style={{ fontSize: 12 }}
                    type="datetime-local"
                    value={form.start?.slice(0, 16) || ""}
                    onChange={e => setForm(f => ({ ...f, start: new Date(e.target.value).toISOString() }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: theme.ts, display: "block", marginBottom: 3 }}>End</label>
                  <input
                    className="ninput"
                    style={{ fontSize: 12 }}
                    type="datetime-local"
                    value={form.end?.slice(0, 16) || ""}
                    onChange={e => setForm(f => ({ ...f, end: new Date(e.target.value).toISOString() }))}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10, color: theme.ts, display: "block", marginBottom: 5 }}>Calendar</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {CALENDARS.map(c => {
                    const sel = form.calendarId === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setForm(f => ({ ...f, calendarId: c.id }))}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "4px 8px",
                          fontSize: 11,
                          fontWeight: 600,
                          color: sel ? theme.tx : theme.ts,
                          background: sel ? theme.sa : "transparent",
                          border: `1px solid ${sel ? c.color : theme.bd}`,
                          borderRadius: theme.r6,
                          cursor: "pointer",
                          fontFamily: theme.fn,
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color }} />
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10, color: theme.ts, display: "block", marginBottom: 3 }}>Notes</label>
                <input
                  className="ninput"
                  placeholder="Add notes…"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, marginTop: 18, justifyContent: "flex-end" }}>
              {modal.mode === "edit" && (
                <button
                  className="nb ng"
                  style={{ color: theme.er, borderColor: theme.er + "44", fontSize: 12 }}
                  onClick={() => deleteEvent(modal.ev.id)}
                >
                  <I.Trash size={12} /> Delete
                </button>
              )}
              <button className="nb ng" style={{ fontSize: 12 }} onClick={() => setModal(null)}>Cancel</button>
              <button className="nb np" style={{ fontSize: 12 }} onClick={saveEvent}>Save event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
