import React, { useState, useEffect, useRef } from "react";
import { I } from "../../shared/icons";
import { AppsSidebar, AppsSidebarSection, DefaultSections } from "../../shared/apps_sidebar";
import { utils, registry as registryU } from "../../shared/_utils";
import { CalendarConstants } from "../../shared/_constants";
import { useDocState } from "../../shared/hooks/doc_state";
import { NEW_CAL_COLORS, _ymd, _parseDoc, buildMonthCells, expandEvents } from "./shared";
import { DayView } from "./day";
import { WeekView } from "./week";
import { MonthView } from "./month";
import { YearView } from "./years";

export const CalendarEditor = ({ appColor, doc, t: theme, onContentChange, registerActions, isMobile, onBack, saveStatus, activeWS, onTitleChange, onOpenDoc }) => {
  const now = new Date();
  const [view,    setView]    = useState("month");
  const [cursor,  setCursor]  = useState(now);
  const [data,    setData]    = useDocState(doc, _parseDoc, onContentChange);
  const [editing, setEditing] = useState(null);
  const [linkPicker,    setLinkPicker]    = useState(false);
  const [newCalConfirm, setNewCalConfirm] = useState(null);
  const todayCellRef       = useRef(null);
  const todayMonthCardRef  = useRef(null);
  const cellClickTimerRef  = useRef(null);

  const events    = data.events;
  const userCals  = data.calendars;
  const allCals   = [...CalendarConstants.CALENDARS, ...userCals];
  const setEvents = (updater) =>
    setData(d => ({ ...d, events: typeof updater === "function" ? updater(d.events) : updater }));

  const [visible, setVisible] = useState(() => new Set(allCals.map(c => c.calId)));

  const year  = cursor.getFullYear();
  const month = cursor.getMonth();
  const calColor = calId => allCals.find(c => c.calId === calId)?.color || theme.accent;

  // Reused field styling for the editor inputs / textareas.
  const field = {
    background: theme.surfaceAlt,
    border: `1px solid ${theme.border}`,
    borderRadius: theme.r6,
    padding: "9px 11px",
    color: theme.text,
    fontFamily: theme.fontFamily,
    fontSize: 13,
    outline: "none",
  };

  // ── Per-view stride / title (no if-chains) ──────────────────────────────
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
  const shiftMonth = dir => setCursor(c => {
    const d = new Date(c);
    d.setMonth(d.getMonth() + dir);
    return d;
  });

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

  // ── Calendar visibility + event lifecycle ───────────────────────────────
  const toggleCal = id => setVisible(s => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const isToday = day =>
    day === now.getDate() && month === now.getMonth() && year === now.getFullYear();

  const openNew = (date) => setEditing({
    calId: CalendarConstants.CALENDARS[0].calId, title: "", date, time: "", endTime: "",
    notes: "", links: [], repeat: null, endDate: null,
  });
  const openEdit = (ev) => {
    if (ev.id === "__preview__") return;
    setEditing({ ...ev });
  };
  // Close paths:
  //   closeEditor    — cancel (Cancel button only): discards the in-progress draft.
  //   applyAndClose  — X / backdrop / Save / opening a linked doc: commits the
  //                    draft to the events list, then clears. Empty title is
  //                    treated as nothing to save.
  const closeEditor = () => {
    setEditing(null);
    setLinkPicker(false);
    setNewCalConfirm(null);
  };

  const applyAndClose = () => {
    if (editing) {
      const t = editing.title.trim();
      if (t) {
        setEvents(curr => {
          if (editing.id) return curr.map(e => e.id === editing.id ? { ...editing, title: t } : e);
          return [...curr, { ...editing, title: t, id: utils._elId() }];
        });
      }
    }
    closeEditor();
  };

  const createCalendar = (name, color) => {
    const calId = `u_${utils._elId()}`;
    const cal = { calId, name: name.trim(), color };
    setData(d => ({ ...d, calendars: [...d.calendars, cal] }));
    setVisible(s => new Set(s).add(calId));
    return cal;
  };

  const deleteEvent = () => {
    if (!editing?.id) return closeEditor();
    setEvents(curr => curr.filter(e => e.id !== editing.id));
    closeEditor();
  };

  // Save before navigating to a linked doc so the in-progress draft survives.
  const openLinkedDoc = (d) => {
    applyAndClose();
    onOpenDoc?.(d);
  };

  // ── Cell click: single = new event (delayed), double = jump to day ──────
  const onCellSingleClick = (dateStr) => {
    if (!dateStr) return;
    clearTimeout(cellClickTimerRef.current);
    cellClickTimerRef.current = setTimeout(() => {
      openNew(dateStr);
      cellClickTimerRef.current = null;
    }, 200);
  };
  const onCellDoubleClick = (dateStr) => {
    if (!dateStr) return;
    clearTimeout(cellClickTimerRef.current);
    cellClickTimerRef.current = null;
    setCursor(new Date(`${dateStr}T00:00:00`));
    setView("day");
  };

  // ── Effects ─────────────────────────────────────────────────────────────
  useEffect(() => {
    registerActions?.((id, val) => {
      if (id === "today")       setCursor(new Date());
      if (id === "prev")        shift(-1);
      if (id === "next")        shift(1);
      if (id === "view" && val) setView(val);
    });
  }, []); // eslint-disable-line

  useEffect(() => {
    const target =
      view === "month" ? todayCellRef.current :
      view === "year"  ? todayMonthCardRef.current :
      null;
    target?.scrollIntoView({ block: "center", inline: "start", behavior: "auto" });
  }, [view, year, month]);

  // ── Live preview: splice the editing draft into rendered events ────────
  let renderedEvents = events;
  if (editing) {
    const draft = { ...editing, id: editing.id || "__preview__" };
    renderedEvents = editing.id
      ? events.map(e => e.id === editing.id ? draft : e)
      : [...events, draft];
  }
  const expand = (from, to) => expandEvents(renderedEvents, visible, from, to);
  const eventsByDate = expand(new Date(year, month, 1), new Date(year, month + 1, 0));

  // ── View dispatch table ─────────────────────────────────────────────────
  const renderView = {
    day:   () => <DayView   theme={theme} appColor={appColor} cursor={cursor} expand={expand} isToday={isToday} openNew={openNew} openEdit={openEdit} calColor={calColor} />,
    week:  () => <WeekView  theme={theme} appColor={appColor} cursor={cursor} now={now} expand={expand} onCellSingleClick={onCellSingleClick} onCellDoubleClick={onCellDoubleClick} openEdit={openEdit} calColor={calColor} />,
    month: () => <MonthView theme={theme} appColor={appColor} year={year} month={month} eventsByDate={eventsByDate} isToday={isToday} onCellSingleClick={onCellSingleClick} onCellDoubleClick={onCellDoubleClick} openEdit={openEdit} calColor={calColor} todayCellRef={todayCellRef} />,
    year:  () => <YearView  theme={theme} appColor={appColor} year={year} now={now} expand={expand} calColor={calColor} onPickMonth={(y, m) => { setCursor(new Date(y, m, 1)); setView("month"); }} todayMonthCardRef={todayMonthCardRef} />,
  };

  // ── Sidebar mini-month (jump to date) ───────────────────────────────────
  const renderMiniMonth = () => {
    const cells = buildMonthCells(year, month);
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1 }}>
        {CalendarConstants.DAYS_MINI.map((d, i) => (
          <div key={i} style={{ fontSize: 9, color: theme.textMuted, textAlign: "center", fontWeight: 600, padding: "2px 0" }}>
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
              onMouseEnter={e => { if (d && !today) e.currentTarget.style.background = theme.surfaceAlt; }}
              onMouseLeave={e => { if (d && !today) e.currentTarget.style.background = "transparent"; }}
            >
              {d || ""}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Editor modal ────────────────────────────────────────────────────────
  const renderEditor = () => {
    if (!editing) return null;
    const linkedDocs = editing.links
      .map(id => (activeWS?.docs || []).find(d => d.id === id))
      .filter(Boolean);
    const repeatOn   = Array.isArray(editing.repeat);
    const repeatDays = repeatOn ? editing.repeat : [];
    const endOn      = typeof editing.endDate === "string";
    const accent     = (allCals.find(c => c.calId === editing.calId) || allCals[0])?.color || theme.accent;

    const onCalChange = (e) => {
      const v = e.target.value;
      if (v === "__new__") {
        setNewCalConfirm({
          name:  `Calendar ${userCals.length + 1}`,
          color: NEW_CAL_COLORS[userCals.length % NEW_CAL_COLORS.length],
        });
        return;
      }
      setEditing(s => ({ ...s, calId: v }));
    };

    // Compact "label + status + checkbox" toggle row, reused by Schedule + End-date.
    const ToggleRow = ({ on, onToggle, label, status }) => (
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: theme.text, cursor: "pointer", userSelect: "none" }}>
        <span style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${on ? accent : theme.borderStrong}`, background: on ? accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {on && <I.Check size={9} color="#fff" />}
        </span>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: theme.textMuted }}>{status}</span>
      </div>
    );

    return (
      <div onClick={applyAndClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.r10, padding: 22, width: 380, maxHeight: "88vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, fontFamily: theme.fontFamily }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={{ flex: 1, fontSize: 15, fontWeight: 700, color: theme.text, margin: 0 }}>
              {editing.id ? "Edit event" : "New event"}
            </h3>
            <button className="nb ni" style={{ padding: 4 }} onClick={applyAndClose} title="Apply and close">
              <I.X size={13} />
            </button>
          </div>

          <input
            autoFocus
            type="text"
            placeholder="Event title"
            value={editing.title}
            onChange={e => setEditing(s => ({ ...s, title: e.target.value }))}
            onKeyDown={e => { if (e.key === "Enter") applyAndClose(); }}
            style={field}
          />

          <input
            type="date"
            value={editing.date}
            onChange={e => setEditing(s => ({ ...s, date: e.target.value }))}
            style={{ ...field, flex: 1 }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="time" value={editing.time} title="Start time"
              onChange={e => setEditing(s => ({ ...s, time: e.target.value }))}
              style={{ ...field, flex: 1 }}
            />
            <span style={{ color: theme.textMuted, fontSize: 12 }}>→</span>
            <input
              type="time" value={editing.endTime} title="End time"
              onChange={e => setEditing(s => ({ ...s, endTime: e.target.value }))}
              style={{ ...field, flex: 1 }}
            />
          </div>

          <select value={editing.calId} onChange={onCalChange} style={{ ...field, padding: "9px 16px 9px 11px" }}>
            {allCals.map(c => <option key={c.calId} value={c.calId}>{c.name}</option>)}
            <option value="__new__">+ New calendar…</option>
          </select>

          {/* Schedule */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <ToggleRow
              on={repeatOn}
              onToggle={() => setEditing(s => {
                const turningOff = Array.isArray(s.repeat);
                return { ...s, repeat: turningOff ? null : [], endDate: turningOff ? null : s.endDate };
              })}
              label="Schedule"
              status={repeatOn
                ? (repeatDays.length === 0 ? "Pick days" : `${repeatDays.length} ${repeatDays.length === 1 ? "day" : "days"}/week`)
                : "Off"}
            />
            <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
              {CalendarConstants.DAYS_MINI.map((label, i) => {
                const on = repeatOn && repeatDays.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!repeatOn}
                    onClick={() => setEditing(s => {
                      if (!Array.isArray(s.repeat)) return s;
                      const has = s.repeat.includes(i);
                      return { ...s, repeat: has ? s.repeat.filter(n => n !== i) : [...s.repeat, i].sort((a, b) => a - b) };
                    })}
                    style={{
                      width: 30, height: 30, borderRadius: "50%",
                      border: `1.5px solid ${on ? accent : theme.border}`,
                      background: on ? accent : "transparent",
                      color: on ? "#fff" : (repeatOn ? theme.text : theme.textMuted),
                      fontFamily: theme.fontFamily, fontSize: 11, fontWeight: 700,
                      cursor: repeatOn ? "pointer" : "not-allowed",
                      opacity: repeatOn ? 1 : 0.4,
                      transition: theme.transition, padding: 0, outline: "none",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {repeatOn && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
                <ToggleRow
                  on={endOn}
                  onToggle={() => setEditing(s => ({ ...s, endDate: typeof s.endDate === "string" ? null : "" }))}
                  label="End date"
                  status={endOn ? (editing.endDate ? `Stops after ${editing.endDate}` : "Pick a date") : "No end"}
                />
                {endOn && (
                  <input
                    type="date"
                    value={editing.endDate}
                    min={editing.date}
                    onChange={e => setEditing(s => ({ ...s, endDate: e.target.value }))}
                    style={field}
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
            style={{ ...field, resize: "vertical", minHeight: 60 }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 10, color: theme.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Linked documents
            </span>
            {linkedDocs.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {linkedDocs.map(d => {
                  const def = registryU._app(d.type);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => openLinkedDoc(d)}
                      title={`Open ${d.title}`}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: theme.r6, padding: "5px 6px 5px 9px", fontSize: 12, color: theme.text, fontFamily: theme.fontFamily, cursor: "pointer", maxWidth: 200 }}
                    >
                      <def.Icon size={11} color={def.defaultColor} />
                      <span style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{d.title}</span>
                      <span
                        role="button"
                        onClick={e => { e.stopPropagation(); setEditing(s => ({ ...s, links: s.links.filter(id => id !== d.id) })); }}
                        style={{ display: "inline-flex", alignItems: "center", padding: 2, borderRadius: theme.r6, color: theme.textMuted, cursor: "pointer" }}
                        title="Remove link"
                      >
                        <I.X size={10} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setLinkPicker(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, ...field, fontSize: 12, fontWeight: 600, color: theme.textDim, cursor: "pointer", padding: "8px 12px", flex: linkedDocs.length > 0 ? "0 0 auto" : 1 }}
              >
                <I.Search size={12} />
                Link documents…
              </button>
              {linkedDocs.length > 0 && (
                <button
                  type="button"
                  className="nb np"
                  onClick={() => openLinkedDoc(linkedDocs[0])}
                  style={{ fontSize: 12, padding: "8px 12px", flex: 1 }}
                  title={linkedDocs.length === 1 ? `Open ${linkedDocs[0].title}` : `Open ${linkedDocs[0].title} (${linkedDocs.length - 1} more linked)`}
                >
                  <I.ArrowR size={12} />
                  Open {linkedDocs.length === 1 ? "document" : `documents (${linkedDocs.length})`}
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {editing.id && (
              <button className="nb ni" onClick={deleteEvent} style={{ fontSize: 12, padding: "7px 12px", color: "#F87171" }}>
                <I.Trash size={12} /> Delete
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button className="nb ng" onClick={closeEditor} style={{ fontSize: 12, padding: "7px 14px" }} title="Discard changes">
              Cancel
            </button>
            <button className="nb np" onClick={applyAndClose} style={{ fontSize: 12, padding: "7px 14px" }}>
              <I.Check size={12} /> Save
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── New-calendar confirmation popup ─────────────────────────────────────
  const renderNewCalConfirm = () => {
    if (!newCalConfirm) return null;
    const trimmed = newCalConfirm.name.trim();
    const confirm = () => {
      if (!trimmed) return;
      const cal = createCalendar(trimmed, newCalConfirm.color);
      setEditing(s => ({ ...s, calId: cal.calId }));
      setNewCalConfirm(null);
    };
    return (
      <div className="novl" onClick={e => { if (e.target === e.currentTarget) setNewCalConfirm(null); }} style={{ zIndex: 600 }}>
        <div className="nmod" style={{ width: 360, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: theme.text, margin: 0 }}>Create new calendar?</h3>
            <p style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>
              This will add a new calendar to this workspace. Your event details will be kept either way.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 10, color: theme.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Name</label>
            <input
              autoFocus
              type="text"
              value={newCalConfirm.name}
              onChange={e => setNewCalConfirm(s => ({ ...s, name: e.target.value }))}
              onKeyDown={e => {
                if (e.key === "Enter") confirm();
                if (e.key === "Escape") setNewCalConfirm(null);
              }}
              style={{ ...field, fontSize: 13, padding: "7px 9px" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 10, color: theme.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Color</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {NEW_CAL_COLORS.map(c => {
                const sel = c === newCalConfirm.color;
                return (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    onClick={() => setNewCalConfirm(s => ({ ...s, color: c }))}
                    style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: sel ? `2px solid ${theme.text}` : `2px solid transparent`, cursor: "pointer", padding: 0, outline: "none" }}
                  />
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4, justifyContent: "flex-end" }}>
            <button className="nb ng" onClick={() => setNewCalConfirm(null)} style={{ fontSize: 12, padding: "6px 14px" }}>No</button>
            <button className="nb np" onClick={confirm} disabled={!trimmed} style={{ fontSize: 12, padding: "6px 14px", opacity: trimmed ? 1 : 0.5 }}>
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
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
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
                  padding: "4px 12px", borderRadius: theme.r6, border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: view === v ? 700 : 500,
                  background: view === v ? theme.surface : "transparent",
                  color: view === v ? theme.text : theme.textDim,
                  fontFamily: theme.fontFamily, textTransform: "capitalize",
                }}
              >
                {v}
              </button>
            ))}
          </div>
          <button className="nb ng" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => setCursor(new Date())}>
            Today
          </button>
          <button className="nb np" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => openNew(_ymd(year, month, now.getDate()))}>
            <I.Plus size={11} /> New
          </button>
        </div>

        {(renderView[view] || renderView.month)()}
      </div>

      {/* Sidebar */}
      <AppsSidebar doc={doc} appColor={appColor} mobile={isMobile} onBack={onBack} saveStatus={saveStatus} activeWS={activeWS} onTitleChange={onTitleChange}>
        <AppsSidebarSection title="My Calendars" icon={I.Calendar}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {allCals.map(c => {
              const on = visible.has(c.calId);
              return (
                <button
                  key={c.calId}
                  onClick={() => toggleCal(c.calId)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", background: "transparent", border: "none", cursor: "pointer", borderRadius: theme.r6, fontFamily: theme.fontFamily }}
                >
                  <span style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${on ? c.color : theme.borderStrong}`, background: on ? c.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {on && <I.Check size={9} color="#fff" />}
                  </span>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0, opacity: on ? 1 : 0.4 }} />
                  <span style={{ fontSize: 12, color: on ? theme.text : theme.textDim, fontWeight: 500, textAlign: "left", flex: 1 }}>
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        </AppsSidebarSection>

        <AppsSidebarSection title={`${CalendarConstants.MONTHS[month]} ${year}`} icon={I.Calendar}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <div style={{ flex: 1, fontSize: 11, color: theme.textDim, fontWeight: 600 }}>Jump to date</div>
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
      {editing && linkPicker && (
        <DocLinkPicker
          theme={theme}
          docs={(activeWS?.docs || []).filter(d => d.id !== doc.id)}
          selected={editing.links}
          onApply={(ids) => { setEditing(s => ({ ...s, links: ids })); setLinkPicker(false); }}
          onClose={() => setLinkPicker(false)}
        />
      )}
      {renderNewCalConfirm()}
    </div>
  );
};

// ── DocLinkPicker ──────────────────────────────────────────────────────────
// CommandPalette-styled multi-select: search input + filtered doc list with
// checkboxes. Stays here because it's only used by the calendar editor.
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

  const toggle = (id) => setSel(s => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  return (
    <div className="novl" onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ zIndex: 600 }}>
      <div style={{ background: theme.elevated, border: `1px solid ${theme.borderStrong}`, borderRadius: theme.r20, width: "100%", maxWidth: 520, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.6)", animation: "popIn 0.15s ease", marginTop: "-10vh", display: "flex", flexDirection: "column", maxHeight: "70vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${theme.border}` }}>
          <I.Search size={16} color={theme.textDim} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter")  onApply([...sel]);
            }}
            placeholder="Search documents to link…"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 14, color: theme.text, fontFamily: theme.fontFamily }}
          />
          <span style={{ fontSize: 11, color: theme.textMuted, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: theme.r6, padding: "2px 7px", fontWeight: 600 }}>
            {sel.size} selected
          </span>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {results.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 12, color: theme.textMuted }}>
              {docs.length === 0 ? "No documents in this workspace yet" : `No documents match "${q}"`}
            </div>
          )}
          {results.map(({ d }) => {
            const def = registryU._app(d.type);
            const on  = sel.has(d.id);
            return (
              <div
                key={d.id}
                onClick={() => toggle(d.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", margin: "0 4px", borderRadius: theme.r10, cursor: "pointer", background: on ? theme.surfaceAlt : "transparent", transition: "background 0.1s" }}
                onMouseEnter={e => { if (!on) e.currentTarget.style.background = theme.surfaceShade; }}
                onMouseLeave={e => { if (!on) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${on ? theme.accent : theme.borderStrong}`, background: on ? theme.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {on && <I.Check size={11} color="#fff" />}
                </span>
                <div style={{ width: 28, height: 28, borderRadius: theme.r6, background: theme.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <def.Icon size={13} color={def.defaultColor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.title}
                  </div>
                  <div style={{ fontSize: 11, color: theme.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {def.label}
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ height: 6 }} />
        </div>

        <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderTop: `1px solid ${theme.border}`, justifyContent: "flex-end" }}>
          <button className="nb ng" onClick={onClose} style={{ fontSize: 12, padding: "6px 14px" }}>Cancel</button>
          <button className="nb np" onClick={() => onApply([...sel])} style={{ fontSize: 12, padding: "6px 14px" }}>
            <I.Check size={12} /> Apply
          </button>
        </div>
      </div>
    </div>
  );
};
