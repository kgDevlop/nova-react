import React, { useState, useEffect, useRef } from "react";
import { I } from "../shared/icons";
import { AppsSidebar, AppsSidebarSection, DefaultSections } from "../shared/apps_sidebar";
import { utils, registry as registryU } from "../shared/_utils";
import { CalendarConstants } from "../shared/_constants";
import { useDocState } from "../shared/hooks/doc_state";

const NEW_CAL_COLORS = ["#F59E0B", "#EC4899", "#22D3EE", "#A78BFA", "#34D399", "#FB7185", "#818CF8"];

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

// "HH:MM" (24hr, the form input format) → "h:mm AM/PM" for display.
const _fmtTime = (hhmm) => {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const ampm = h < 12 ? "AM" : "PM";
  const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
};

const _normEvents = (arr) => arr
  .filter(e => e && typeof e.id === "string" && typeof e.date === "string")
  .map(e => ({
    id:      e.id,
    calId:   typeof e.calId === "string" ? e.calId : CalendarConstants.CALENDARS[0].id,
    title:   typeof e.title === "string" ? e.title : "",
    date:    e.date,
    time:    typeof e.time    === "string" ? e.time    : "",
    endTime: typeof e.endTime === "string" ? e.endTime : "",
    notes:   typeof e.notes   === "string" ? e.notes   : "",
    links:   Array.isArray(e.links) ? e.links.filter(x => typeof x === "string") : [],
    // null = scheduling off; array (possibly empty) = scheduling on with selected weekdays.
    repeat:  Array.isArray(e.repeat)
      ? e.repeat.filter(n => Number.isInteger(n) && n >= 0 && n <= 6)
      : null,
    // null = no end date; string = "" or "YYYY-MM-DD" once user enables the cap.
    endDate: typeof e.endDate === "string" ? e.endDate : null,
  }));

const _normCalendars = (arr) => arr
  .filter(c => c && typeof c.id === "string" && typeof c.name === "string" && typeof c.color === "string");

const _parseDoc = (content) => {
  try {
    const p = JSON.parse(content || "{}");
    // Legacy shape: a bare array of events.
    if (Array.isArray(p)) return { events: _normEvents(p), calendars: [] };
    return {
      events:    Array.isArray(p.events)    ? _normEvents(p.events)       : [],
      calendars: Array.isArray(p.calendars) ? _normCalendars(p.calendars) : [],
    };
  } catch {
    return { events: [], calendars: [] };
  }
};

export const CalendarEditor = ({ appColor, doc, t: theme, onContentChange, registerActions, isMobile, onBack, saveStatus, activeWS, onTitleChange }) => {
  const now = new Date();
  const [view,    setView]    = useState("month");
  const [cursor,  setCursor]  = useState(now);
  const [data,    setData]    = useDocState(doc, _parseDoc, onContentChange);
  const [editing, setEditing] = useState(null); // { id?, calId, title, date, time, repeat }
  const [linkPicker,    setLinkPicker]    = useState(false);
  const [newCalConfirm, setNewCalConfirm] = useState(null); // { name, color }
  const todayCellRef       = useRef(null);
  const todayMonthCardRef  = useRef(null);
  const cellClickTimerRef  = useRef(null);

  // Single click opens the new-event editor; double click jumps to the day
  // view for that date. The single-click action is deferred by the dblclick
  // threshold so the editor doesn't briefly flash open during a double click.
  const onCellSingleClick = (dateStr) => {
    if (!dateStr) return;
    clearTimeout(cellClickTimerRef.current);
    cellClickTimerRef.current = setTimeout(() => {
      openNew(dateStr);
      cellClickTimerRef.current = null;
    }, 192);
  };
  const onCellDoubleClick = (dateStr) => {
    if (!dateStr) return;
    clearTimeout(cellClickTimerRef.current);
    cellClickTimerRef.current = null;
    setCursor(new Date(`${dateStr}T00:00:00`));
    setView("day");
  };

  const events    = data.events;
  const userCals  = data.calendars;
  const allCals   = [...CalendarConstants.CALENDARS, ...userCals];
  const setEvents = (updater) =>
    setData(d => ({ ...d, events: typeof updater === "function" ? updater(d.events) : updater }));

  // Default every calendar visible on first render; createCalendar adds new
  // ids as they are created, so a "re-sync" effect would clobber the user's
  // manual hides.
  const [visible, setVisible] = useState(() => new Set(allCals.map(c => c.id)));

  const year  = cursor.getFullYear();
  const month = cursor.getMonth();

  // Per-view stride for prev/next: how the cursor advances in each mode.
  const SHIFT = {
    day:   (d, n) => d.setDate(d.getDate() + n),
    week:  (d, n) => d.setDate(d.getDate() + 7 * n),
    month: (d, n) => d.setMonth(d.getMonth() + n),
    year:  (d, n) => d.setFullYear(d.getFullYear() + n),
  };
  const shift = dir => setCursor(c => {
    const d = new Date(c);
    SHIFT[view](d, dir);
    return d;
  });
  // The mini-month sidebar always pages by month regardless of the main view.
  const shiftMonth = dir => setCursor(c => {
    const d = new Date(c);
    d.setMonth(d.getMonth() + dir);
    return d;
  });

  // Per-view header label.
  const VIEW_TITLE = {
    day:   () => `${CalendarConstants.DAYS_LONG[cursor.getDay()]}, ${CalendarConstants.MONTHS[month]} ${cursor.getDate()}, ${year}`,
    week:  () => {
      const start = new Date(cursor);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${CalendarConstants.MONTHS[start.getMonth()]} ${start.getDate()} – ${CalendarConstants.MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
    },
    month: () => `${CalendarConstants.MONTHS[month]} ${year}`,
    year:  () => `${year}`,
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
    calId: CalendarConstants.CALENDARS[0].id, title: "", date, time: "", endTime: "",
    notes: "", links: [], repeat: null, endDate: null,
  });
  const openEdit = (ev) => {
    // Clicking a preview chip while already editing is a no-op — it's the same
    // draft. Without this guard, the preview's sentinel id would leak into
    // `editing` and saveEvent's map() would silently drop the new event.
    if (ev.id === "__preview__") return;
    setEditing({ ...ev });
  };
  const closeEditor = () => {
    setEditing(null);
    setLinkPicker(false);
    setNewCalConfirm(null);
  };

  const createCalendar = (name, color) => {
    const id  = `u_${utils._elId()}`;
    const cal = { id, name: name.trim(), color };
    setData(d => ({ ...d, calendars: [...d.calendars, cal] }));
    setVisible(s => new Set(s).add(id));
    return cal;
  };

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
      if (id === "prev")        shift(-1);
      if (id === "next")        shift(1);
      if (id === "view" && val) setView(val);
    });
  }, []); // eslint-disable-line

  // After every view/cursor change, drop the scroll position onto today.
  // Pin today to the left edge horizontally; keep it centered vertically so
  // the rows around it stay visible. Only fires when today's cell is
  // mounted (visible window includes today), so prev/next navigation away
  // from today is left alone.
  useEffect(() => {
    const target =
      view === "month" ? todayCellRef.current :
      view === "year"  ? todayMonthCardRef.current :
      null;
    target?.scrollIntoView({ block: "center", inline: "start", behavior: "auto" });
  }, [view, year, month]);

  // While the editor is open, splice the in-progress draft into the rendered
  // event list so toggling days/the end-date cap previews live in the grid.
  // Untitled drafts still preview — the chip's color band is enough to read.
  let renderedEvents = events;
  if (editing) {
    const draft = { ...editing, id: editing.id || "__preview__" };
    renderedEvents = editing.id
      ? events.map(e => e.id === editing.id ? draft : e)
      : [...events, draft];
  }

  // Expand `renderedEvents` into a `{ ymd → events[] }` map for any [from,to]
  // date window. Honors weekday schedule + optional end-date cap. Used by all
  // four views (day/week/month/year).
  const expandRange = (from, to) => {
    const out = {};
    const push = (ymd, ev) => (out[ymd] = out[ymd] || []).push(ev);
    for (const e of renderedEvents) {
      if (!visible.has(e.calId)) continue;
      const start = new Date(`${e.date}T00:00:00`);
      const cap   = e.endDate ? new Date(`${e.endDate}T00:00:00`) : null;
      const recurs = Array.isArray(e.repeat) && e.repeat.length > 0;

      // Original date if it lands in the window and isn't past the cap.
      if (start >= from && start <= to && (!cap || start <= cap)) {
        push(e.date, e);
      }
      if (!recurs) continue;

      // Walk the window day-by-day, emitting on matching weekdays after start.
      const cur = new Date(from);
      while (cur <= to) {
        const ymd = _ymd(cur.getFullYear(), cur.getMonth(), cur.getDate());
        if (ymd !== e.date && cur >= start && (!cap || cur <= cap) && e.repeat.includes(cur.getDay())) {
          push(ymd, e);
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
    // Chronological sort within each day; untimed last.
    Object.values(out).forEach(list =>
      list.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99")));
    return out;
  };

  // The month grid expands events on the visible month; other views call
  // expandRange themselves with their own windows.
  const eventsByDate = expandRange(
    new Date(year, month, 1),
    new Date(year, month + 1, 0),
  );

  const calColor = id => allCals.find(c => c.id === id)?.color || theme.accent;

  // ── Mini month (sidebar) ────────────────────────────────────────────────

  const renderMiniMonth = () => {
    const cells = buildMonthCells(year, month);
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1 }}>
        {CalendarConstants.DAYS_MINI.map((d, i) => (
          <div
            key={i}
            style={{
              fontSize: 9,
              color: theme.textMuted,
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
              onClick={() => {
                if (d == null) return;
                setCursor(new Date(year, month, d));
                setView("day");
              }}
              style={{
                height: 30,
                fontSize: 10,
                fontWeight: today ? 700 : 500,
                color: today ? "#fff" : d ? theme.text : "transparent",
                background: today ? appColor : "transparent",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: d ? "pointer" : "default",
                transition: theme.transition,
              }}
              onMouseEnter={e => {
                if (d && !today) e.currentTarget.style.background = theme.surfaceAlt;
              }}
              onMouseLeave={e => {
                if (d && !today) e.currentTarget.style.background = "transparent";
              }}
            >
              {d || ""}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Single event chip, reused by every view ────────────────────────────

  const renderChip = (ev, opts = {}) => {
    const color = calColor(ev.calId);
    const { compact = false } = opts;
    return (
      <button
        key={ev.id}
        onClick={e => { e.stopPropagation(); openEdit(ev); }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: compact ? "2px 5px" : "4px 8px",
          background: `${color}22`,
          border: "none",
          borderLeft: `3px solid ${color}`,
          borderRadius: 3,
          cursor: "pointer",
          fontSize: compact ? 10 : 12,
          fontWeight: 600,
          color: theme.text,
          fontFamily: theme.fontFamily,
          textAlign: "left",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {ev.time && (
          <span style={{ color: theme.textMuted, fontWeight: 500 }}>
            {ev.endTime ? `${_fmtTime(ev.time)}–${_fmtTime(ev.endTime)}` : _fmtTime(ev.time)}
          </span>
        )}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {ev.title || (ev.id === "__preview__" ? "(new)" : "")}
        </span>
      </button>
    );
  };

  // ── Day view ───────────────────────────────────────────────────────────

  const renderDayView = () => {
    const ymd = _ymd(year, month, cursor.getDate());
    const day = new Date(year, month, cursor.getDate());
    const map = expandRange(day, day);
    const list = map[ymd] || [];
    return (
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <div
              style={{
                fontSize: 38,
                fontWeight: 800,
                color: isToday(day.getDate()) ? "#fff" : theme.text,
                background: isToday(day.getDate()) ? appColor : "transparent",
                width: isToday(day.getDate()) ? 56 : "auto",
                height: isToday(day.getDate()) ? 56 : "auto",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              {day.getDate()}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: theme.text, letterSpacing: "-0.01em" }}>
              {CalendarConstants.DAYS_LONG[day.getDay()]}, {CalendarConstants.MONTHS[month]} {day.getDate()}, {year}
            </div>
          </div>

          {list.length === 0 ? (
            <div
              onClick={() => openNew(ymd)}
              style={{
                padding: 24,
                border: `1px dashed ${theme.border}`,
                borderRadius: theme.r10,
                color: theme.textMuted,
                textAlign: "center",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              No events. Click to add one.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {list.map(ev => renderChip(ev))}
              <button
                className="nb ng"
                onClick={() => openNew(ymd)}
                style={{ alignSelf: "flex-start", marginTop: 6, fontSize: 12 }}
              >
                <I.Plus size={12} /> Add event
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Week view ──────────────────────────────────────────────────────────

  const renderWeekView = () => {
    const start = new Date(cursor);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const map = expandRange(start, end);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
    return (
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(7, minmax(${CalendarConstants.CELL_MIN_W}px, 1fr))`,
            gap: 1,
            background: theme.border,
            border: `1px solid ${theme.border}`,
          }}
        >
          {days.map(d => (
            <div
              key={`h-${d.getTime()}`}
              style={{
                background: theme.surface,
                padding: "8px 6px",
                textAlign: "center",
                fontSize: 11,
                fontWeight: 600,
                color: theme.textDim,
              }}
            >
              {CalendarConstants.DAYS[d.getDay()]}
              <div
                style={{
                  marginTop: 4,
                  fontSize: 16,
                  fontWeight: 700,
                  color: isToday(d.getDate()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() ? "#fff" : theme.text,
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: isToday(d.getDate()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() ? appColor : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "4px auto 0",
                }}
              >
                {d.getDate()}
              </div>
            </div>
          ))}
          {days.map(d => {
            const ymd = _ymd(d.getFullYear(), d.getMonth(), d.getDate());
            const list = map[ymd] || [];
            return (
              <div
                key={`c-${d.getTime()}`}
                onClick={() => onCellSingleClick(ymd)}
                onDoubleClick={() => onCellDoubleClick(ymd)}
                style={{
                  background: theme.surface,
                  minHeight: 360,
                  padding: 6,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                {list.map(ev => renderChip(ev, { compact: true }))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Year view: 12 mini-month cards (recursively reuses month rendering) ─

  const renderYearView = () => (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: 16,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 14,
      }}
    >
      {Array.from({ length: 12 }, (_, m) => renderMiniMonthCard(year, m))}
    </div>
  );

  const renderMiniMonthCard = (y, m) => {
    const cells = buildMonthCells(y, m);
    const map = expandRange(new Date(y, m, 1), new Date(y, m + 1, 0));
    const isCurrent = y === now.getFullYear() && m === now.getMonth();
    return (
      <div
        key={`mm-${y}-${m}`}
        ref={isCurrent ? todayMonthCardRef : null}
        onClick={() => { setCursor(new Date(y, m, 1)); setView("month"); }}
        style={{
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: theme.r10,
          padding: 10,
          cursor: "pointer",
          fontFamily: theme.fontFamily,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 8 }}>
          {CalendarConstants.MONTHS[m]}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1 }}>
          {CalendarConstants.DAYS_MINI.map((d, i) => (
            <div
              key={`yh-${i}`}
              style={{
                fontSize: 9,
                color: theme.textMuted,
                textAlign: "center",
                fontWeight: 600,
                padding: "2px 0",
              }}
            >
              {d}
            </div>
          ))}
          {cells.map((d, i) => {
            const ymd = d ? _ymd(y, m, d) : null;
            const dayEvs = ymd ? (map[ymd] || []) : [];
            const isT =
              d != null &&
              d === now.getDate() &&
              m === now.getMonth() &&
              y === now.getFullYear();
            return (
              <div
                key={`yc-${i}`}
                style={{
                  height: 26,
                  fontSize: 10,
                  fontWeight: isT ? 700 : 500,
                  color: isT ? "#fff" : d ? theme.text : "transparent",
                  background: isT ? appColor : "transparent",
                  borderRadius: "50%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {d || ""}
                {dayEvs.length > 0 && (
                  <div style={{ display: "flex", gap: 1, position: "absolute", bottom: 1 }}>
                    {dayEvs.slice(0, 3).map((ev, k) => (
                      <span
                        key={k}
                        style={{
                          width: 3,
                          height: 3,
                          borderRadius: "50%",
                          background: calColor(ev.calId),
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
            gridTemplateColumns: `repeat(7, minmax(${CalendarConstants.CELL_MIN_W}px, 1fr))`,
            gap: 1,
            background: theme.border,
            border: `1px solid ${theme.border}`,
          }}
        >
          {CalendarConstants.DAYS.map(d => (
            <div
              key={d}
              style={{
                background: theme.surface,
                padding: "6px 0",
                textAlign: "center",
                fontSize: 11,
                fontWeight: 600,
                color: theme.textDim,
              }}
            >
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            const dateStr = day ? _ymd(year, month, day) : null;
            const dayEvents = dateStr ? (eventsByDate[dateStr] || []) : [];
            const today = day && isToday(day);
            return (
              <div
                key={i}
                ref={today ? todayCellRef : null}
                onClick={() => onCellSingleClick(dateStr)}
                onDoubleClick={() => onCellDoubleClick(dateStr)}
                style={{
                  background: theme.surface,
                  minHeight: CalendarConstants.CELL_MIN_H,
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
                      color: isToday(day) ? "#fff" : theme.textDim,
                      width: CalendarConstants.TODAY_BADGE,
                      height: CalendarConstants.TODAY_BADGE,
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
                {dayEvents.map(ev => renderChip(ev, { compact: true }))}
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
    const linkedDocs = editing.links
      .map(id => (activeWS?.docs || []).find(d => d.id === id))
      .filter(Boolean);
    const repeatOn = Array.isArray(editing.repeat);
    const repeatDays = repeatOn ? editing.repeat : [];
    const currentCal = allCals.find(c => c.id === editing.calId) || allCals[0];
    const accent = currentCal?.color || theme.accent;

    const onCalChange = (e) => {
      const v = e.target.value;
      if (v === "__new__") {
        // Open the confirmation popup; leave editing.calId untouched so the
        // editor still shows the previously-selected calendar if user cancels.
        setNewCalConfirm({
          name:  `Calendar ${userCals.length + 1}`,
          color: NEW_CAL_COLORS[userCals.length % NEW_CAL_COLORS.length],
        });
        return;
      }
      setEditing(s => ({ ...s, calId: v }));
    };

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
            border: `1px solid ${theme.border}`,
            borderRadius: theme.r6,
            padding: 16,
            width: 340,
            maxHeight: "85vh",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            fontFamily: theme.fontFamily,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={{ flex: 1, fontSize: 13, fontWeight: 700, color: theme.text, margin: 0 }}>
              {editing.id ? "Edit" : "New"}
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
              background: theme.surfaceAlt,
              border: `1px solid ${theme.border}`,
              borderRadius: theme.r6,
              padding: "6px 8px",
              color: theme.text,
              fontFamily: theme.fontFamily,
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
                background: theme.surfaceAlt,
                border: `1px solid ${theme.border}`,
                borderRadius: theme.r6,
                padding: "6px 8px",
                color: theme.text,
                fontFamily: theme.fontFamily,
                fontSize: 12,
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="time"
              value={editing.time}
              onChange={e => setEditing(s => ({ ...s, time: e.target.value }))}
              style={{
                flex: 1,
                background: theme.surfaceAlt,
                border: `1px solid ${theme.border}`,
                borderRadius: theme.r6,
                padding: "6px 8px",
                color: theme.text,
                fontFamily: theme.fontFamily,
                fontSize: 12,
                outline: "none",
              }}
              title="Start time"
            />
            <span style={{ color: theme.textMuted, fontSize: 11 }}>→</span>
            <input
              type="time"
              value={editing.endTime}
              onChange={e => setEditing(s => ({ ...s, endTime: e.target.value }))}
              style={{
                flex: 1,
                background: theme.surfaceAlt,
                border: `1px solid ${theme.border}`,
                borderRadius: theme.r6,
                padding: "6px 8px",
                color: theme.text,
                fontFamily: theme.fontFamily,
                fontSize: 12,
                outline: "none",
              }}
              title="End time"
            />
          </div>

          <select
            value={editing.calId}
            onChange={onCalChange}
            style={{
              background: theme.surfaceAlt,
              border: `1px solid ${theme.border}`,
              borderRadius: theme.r6,
              padding: "6px 13px 6px 8px",
              color: theme.text,
              fontFamily: theme.fontFamily,
              fontSize: 12,
              outline: "none",
            }}
          >
            {allCals.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            <option value="__new__">+ New calendar…</option>
          </select>

          {/* Schedule: checkbox enables a row of S M T W T F S day circles */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              onClick={() => setEditing(s => {
                const turningOff = Array.isArray(s.repeat);
                return {
                  ...s,
                  // Off → on: enable scheduling with no days picked yet (empty array).
                  // On → off: collapse back to null so circles re-disable, and
                  // drop the end-date cap since it has nothing to bound.
                  repeat:  turningOff ? null : [],
                  endDate: turningOff ? null : s.endDate,
                };
              })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: theme.text,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  border: `1.5px solid ${repeatOn ? accent : theme.borderStrong}`,
                  background: repeatOn ? accent : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {repeatOn && <I.Check size={9} color="#fff" />}
              </span>
              <span style={{ fontWeight: 600 }}>Schedule</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: theme.textMuted }}>
                {repeatOn
                  ? (repeatDays.length === 0 ? "Pick days" : `${repeatDays.length} ${repeatDays.length === 1 ? "day" : "days"}/week`)
                  : "Off"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
              {CalendarConstants.DAYS_MINI.map((label, i) => {
                const on = repeatOn && repeatDays.includes(i);
                const interactive = repeatOn;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!interactive}
                    onClick={() => setEditing(s => {
                      if (!Array.isArray(s.repeat)) return s;
                      const has = s.repeat.includes(i);
                      return {
                        ...s,
                        repeat: has
                          ? s.repeat.filter(n => n !== i)
                          : [...s.repeat, i].sort((a, b) => a - b),
                      };
                    })}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      border: `1.5px solid ${on ? accent : theme.border}`,
                      background: on ? accent : "transparent",
                      color: on ? "#fff" : (interactive ? theme.text : theme.textMuted),
                      fontFamily: theme.fontFamily,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: interactive ? "pointer" : "not-allowed",
                      opacity: interactive ? 1 : 0.4,
                      transition: theme.transition,
                      padding: 0,
                      outline: "none",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* End-date cap — only shown once schedule is on. */}
            {repeatOn && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
                <div
                  onClick={() => setEditing(s => ({
                    ...s,
                    // Off → on: enable end date, no value yet.
                    // On → off: drop the cap.
                    endDate: typeof s.endDate === "string" ? null : "",
                  }))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: theme.text,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      border: `1.5px solid ${typeof editing.endDate === "string" ? accent : theme.borderStrong}`,
                      background: typeof editing.endDate === "string" ? accent : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {typeof editing.endDate === "string" && <I.Check size={9} color="#fff" />}
                  </span>
                  <span style={{ fontWeight: 600 }}>End date</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, color: theme.textMuted }}>
                    {typeof editing.endDate === "string"
                      ? (editing.endDate ? `Stops after ${editing.endDate}` : "Pick a date")
                      : "No end"}
                  </span>
                </div>
                {typeof editing.endDate === "string" && (
                  <input
                    type="date"
                    value={editing.endDate}
                    min={editing.date}
                    onChange={e => setEditing(s => ({ ...s, endDate: e.target.value }))}
                    style={{
                      background: theme.surfaceAlt,
                      border: `1px solid ${theme.border}`,
                      borderRadius: theme.r6,
                      padding: "6px 8px",
                      color: theme.text,
                      fontFamily: theme.fontFamily,
                      fontSize: 12,
                      outline: "none",
                    }}
                  />
                )}
              </div>
            )}
          </div>

          <textarea
            placeholder="Notes (optional)"
            value={editing.notes}
            onChange={e => setEditing(s => ({ ...s, notes: e.target.value }))}
            rows={3}
            style={{
              background: theme.surfaceAlt,
              border: `1px solid ${theme.border}`,
              borderRadius: theme.r6,
              padding: "6px 8px",
              color: theme.text,
              fontFamily: theme.fontFamily,
              fontSize: 12,
              outline: "none",
              resize: "vertical",
              minHeight: 60,
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 10, color: theme.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
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
                        background: theme.surfaceAlt,
                        border: `1px solid ${theme.border}`,
                        borderRadius: theme.r6,
                        padding: "3px 4px 3px 7px",
                        fontSize: 11,
                        color: theme.text,
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
            <button
              type="button"
              onClick={() => setLinkPicker(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: theme.surfaceAlt,
                border: `1px solid ${theme.border}`,
                borderRadius: theme.r6,
                padding: "6px 10px",
                color: theme.textDim,
                fontFamily: theme.fontFamily,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
              }}
            >
              <I.Search size={11} />
              Link documents…
            </button>
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

  // ── Document picker (Nova-search-style with multi-select checkboxes) ────

  const renderLinkPicker = () => {
    if (!editing || !linkPicker) return null;
    return (
      <DocLinkPicker
        theme={theme}
        docs={(activeWS?.docs || []).filter(d => d.id !== doc.id)}
        selected={editing.links}
        onApply={(ids) => {
          setEditing(s => ({ ...s, links: ids }));
          setLinkPicker(false);
        }}
        onClose={() => setLinkPicker(false)}
      />
    );
  };

  // ── New-calendar confirmation popup ─────────────────────────────────────

  const renderNewCalConfirm = () => {
    if (!newCalConfirm) return null;
    const trimmed = newCalConfirm.name.trim();
    const confirm = () => {
      if (!trimmed) return;
      const cal = createCalendar(trimmed, newCalConfirm.color);
      setEditing(s => ({ ...s, calId: cal.id }));
      setNewCalConfirm(null);
    };
    return (
      <div
        className="novl"
        onClick={e => { if (e.target === e.currentTarget) setNewCalConfirm(null); }}
        style={{ zIndex: 600 }}
      >
        <div
          className="nmod"
          style={{ width: 360, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: theme.text, margin: 0 }}>
              Create new calendar?
            </h3>
            <p style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>
              This will add a new calendar to this workspace. Your event details
              will be kept either way.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 10, color: theme.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Name
            </label>
            <input
              autoFocus
              type="text"
              value={newCalConfirm.name}
              onChange={e => setNewCalConfirm(s => ({ ...s, name: e.target.value }))}
              onKeyDown={e => {
                if (e.key === "Enter") confirm();
                if (e.key === "Escape") setNewCalConfirm(null);
              }}
              style={{
                background: theme.surfaceAlt,
                border: `1px solid ${theme.border}`,
                borderRadius: theme.r6,
                padding: "7px 9px",
                color: theme.text,
                fontFamily: theme.fontFamily,
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 10, color: theme.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Color
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {NEW_CAL_COLORS.map(c => {
                const sel = c === newCalConfirm.color;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewCalConfirm(s => ({ ...s, color: c }))}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: c,
                      border: sel ? `2px solid ${theme.text}` : `2px solid transparent`,
                      cursor: "pointer",
                      padding: 0,
                      outline: "none",
                    }}
                    title={c}
                  />
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4, justifyContent: "flex-end" }}>
            <button
              className="nb ng"
              onClick={() => setNewCalConfirm(null)}
              style={{ fontSize: 12, padding: "6px 14px" }}
            >
              No
            </button>
            <button
              className="nb np"
              onClick={confirm}
              disabled={!trimmed}
              style={{ fontSize: 12, padding: "6px 14px", opacity: trimmed ? 1 : 0.5 }}
            >
              <I.Check size={12} /> Yes, create
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
            borderBottom: `1px solid ${theme.border}`,
            flexShrink: 0,
          }}
        >
          <h2 style={{ fontSize: 17, fontWeight: 800, color: theme.text, marginRight: 6, minWidth: 170 }}>
            {VIEW_TITLE[view]()}
          </h2>
          <button className="nb ni" style={{ padding: 5 }} onClick={() => shift(-1)}>
            <I.ChevLeft size={13} />
          </button>
          <button className="nb ni" style={{ padding: 5 }} onClick={() => shift(1)}>
            <I.ChevRight size={13} />
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 2, background: theme.surfaceAlt, borderRadius: theme.r6, padding: 2 }}>
            {CalendarConstants.VIEWS.map(v => (
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
                  color: view === v ? theme.text : theme.textDim,
                  fontFamily: theme.fontFamily,
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
            <I.Plus size={11} /> New
          </button>
        </div>

        {/* Dispatch table — no if/else chain. Falls back to month if a future
            view kind is added without a renderer. */}
        {(({
          day:   renderDayView,
          week:  renderWeekView,
          month: renderMonthGrid,
          year:  renderYearView,
        })[view] || renderMonthGrid)()}
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
            {allCals.map(c => {
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
                    fontFamily: theme.fontFamily,
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      border: `1.5px solid ${on ? c.color : theme.borderStrong}`,
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
                      color: on ? theme.text : theme.textDim,
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

        <AppsSidebarSection title={`${CalendarConstants.MONTHS[month]} ${year}`} icon={I.Calendar}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <div style={{ flex: 1, fontSize: 11, color: theme.textDim, fontWeight: 600 }}>
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
      {renderLinkPicker()}
      {renderNewCalConfirm()}
    </div>
  );
};

// ── DocLinkPicker ─────────────────────────────────────────────────────────
// Nova-search-style modal: search input + filtered doc list with checkboxes
// for multi-select. Mirrors the CommandPalette styling so it feels native.

const DocLinkPicker = ({ theme, docs, selected, onApply, onClose }) => {
  const [q,    setQ]    = useState("");
  const [sel,  setSel]  = useState(new Set(selected));
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const score = (str, query) => {
    if (!query) return 1;
    const sl = str.toLowerCase();
    const ql = query.toLowerCase();
    if (sl === ql) return 100;
    if (sl.startsWith(ql)) return 80;
    if (sl.includes(ql)) return 50;
    return 0;
  };

  const results = docs
    .map(d => ({ d, _s: score(d.title, q) }))
    .filter(x => x._s > 0)
    .sort((a, b) => b._s - a._s)
    .slice(0, 30);

  const toggle = (id) => {
    setSel(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const apply = () => onApply([...sel]);

  return (
    <div
      className="novl"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ zIndex: 600 }}
    >
      <div
        style={{
          background: theme.elevated,
          border: `1px solid ${theme.borderStrong}`,
          borderRadius: theme.r20,
          width: "100%",
          maxWidth: 520,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          animation: "popIn 0.15s ease",
          marginTop: "-10vh",
          display: "flex",
          flexDirection: "column",
          maxHeight: "70vh",
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <I.Search size={16} color={theme.textDim} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter")  apply();
            }}
            placeholder="Search documents to link…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 14,
              color: theme.text,
              fontFamily: theme.fontFamily,
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: theme.textMuted,
              background: theme.surfaceAlt,
              border: `1px solid ${theme.border}`,
              borderRadius: theme.r6,
              padding: "2px 7px",
              fontWeight: 600,
            }}
          >
            {sel.size} selected
          </span>
        </div>

        {/* Results */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {results.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 12, color: theme.textMuted }}>
              {docs.length === 0 ? "No documents in this workspace yet" : `No documents match "${q}"`}
            </div>
          )}
          {results.map(({ d }) => {
            const def = registryU._app(d.type);
            const on = sel.has(d.id);
            return (
              <div
                key={d.id}
                onClick={() => toggle(d.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  margin: "0 4px",
                  borderRadius: theme.r10,
                  cursor: "pointer",
                  background: on ? theme.surfaceAlt : "transparent",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (!on) e.currentTarget.style.background = theme.surfaceShade; }}
                onMouseLeave={e => { if (!on) e.currentTarget.style.background = "transparent"; }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: `1.5px solid ${on ? theme.accent : theme.borderStrong}`,
                    background: on ? theme.accent : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {on && <I.Check size={11} color="#fff" />}
                </span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: theme.r6,
                    background: theme.surfaceAlt,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <def.Icon size={13} color={def.dc} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: theme.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: theme.textMuted,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {def.label}
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ height: 6 }} />
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "10px 14px",
            borderTop: `1px solid ${theme.border}`,
            justifyContent: "flex-end",
          }}
        >
          <button className="nb ng" onClick={onClose} style={{ fontSize: 12, padding: "6px 14px" }}>
            Cancel
          </button>
          <button className="nb np" onClick={apply} style={{ fontSize: 12, padding: "6px 14px" }}>
            <I.Check size={12} /> Apply
          </button>
        </div>
      </div>
    </div>
  );
};
