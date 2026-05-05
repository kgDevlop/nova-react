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
    borderRadius: theme.radius6,
    padding: "9px 11px",
    color: theme.text,
    fontFamily: theme.fontFamily,
    fontSize: 13,
    outline: "none",
  };

  // ── Per-view stride / title (no if-chains) ──────────────────────────────
  const SHIFT = {
    day:   (date, stepCount) => date.setDate(date.getDate() + stepCount),
    week:  (date, stepCount) => date.setDate(date.getDate() + 7 * stepCount),
    month: (date, stepCount) => date.setMonth(date.getMonth() + stepCount),
    year:  (date, stepCount) => date.setFullYear(date.getFullYear() + stepCount),
  };
  const shift = direction => setCursor(currentCursor => {
    const nextDate = new Date(currentCursor);
    SHIFT[view](nextDate, direction);
    return nextDate;
  });
  const shiftMonth = direction => setCursor(currentCursor => {
    const nextDate = new Date(currentCursor);
    nextDate.setMonth(nextDate.getMonth() + direction);
    return nextDate;
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
  const toggleCal = calId => setVisible(currentVisible => {
    const nextVisible = new Set(currentVisible);
    if (nextVisible.has(calId)) nextVisible.delete(calId); else nextVisible.add(calId);
    return nextVisible;
  });

  const isToday = day =>
    day === now.getDate() && month === now.getMonth() && year === now.getFullYear();

  const openNew = (date) => setEditing({
    calId: CalendarConstants.CALENDARS[0].calId, title: "", date, time: "", endTime: "",
    notes: "", links: [], repeat: null, endDate: null,
  });
  const openEdit = (existingEvent) => {
    if (existingEvent.id === "__preview__") return;
    setEditing({ ...existingEvent });
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
      const trimmedTitle = editing.title.trim();
      if (trimmedTitle) {
        setEvents(currentEvents => {
          if (editing.id) {
            return currentEvents.map(currentEvent =>
              currentEvent.id === editing.id ? { ...editing, title: trimmedTitle } : currentEvent,
            );
          }
          return [...currentEvents, { ...editing, title: trimmedTitle, id: utils._elId() }];
        });
      }
    }
    closeEditor();
  };

  const createCalendar = (name, color) => {
    const calId = `u_${utils._elId()}`;
    const newCalendar = { calId, name: name.trim(), color };
    setData(currentData => ({ ...currentData, calendars: [...currentData.calendars, newCalendar] }));
    setVisible(currentVisible => new Set(currentVisible).add(calId));
    return newCalendar;
  };

  const deleteEvent = () => {
    if (!editing?.id) return closeEditor();
    setEvents(currentEvents => currentEvents.filter(currentEvent => currentEvent.id !== editing.id));
    closeEditor();
  };

  // Save before navigating to a linked doc so the in-progress draft survives.
  const openLinkedDoc = (linkedDoc) => {
    applyAndClose();
    onOpenDoc?.(linkedDoc);
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
    registerActions?.((actionId, actionValue) => {
      if (actionId === "today")               setCursor(new Date());
      if (actionId === "prev")                shift(-1);
      if (actionId === "next")                shift(1);
      if (actionId === "view" && actionValue) setView(actionValue);
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
      ? events.map(currentEvent => currentEvent.id === editing.id ? draft : currentEvent)
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
        {CalendarConstants.DAYS_MINI.map((dayInitial, dayIndex) => (
          <div key={dayIndex} style={{ fontSize: 9, color: theme.textMuted, textAlign: "center", fontWeight: 600, padding: "2px 0" }}>
            {dayInitial}
          </div>
        ))}
        {cells.map((day, cellIndex) => {
          const today = day != null && isToday(day);
          return (
            <div
              key={cellIndex}
              onClick={() => {
                if (day == null) return;
                setCursor(new Date(year, month, day));
                setView("day");
              }}
              style={{
                height: 30,
                fontSize: 10,
                fontWeight: today ? 700 : 500,
                color: today ? "#fff" : day ? theme.text : "transparent",
                background: today ? appColor : "transparent",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: day ? "pointer" : "default",
                transition: theme.transition,
              }}
              onMouseEnter={mouseEnterEvent => { if (day && !today) mouseEnterEvent.currentTarget.style.background = theme.surfaceAlt; }}
              onMouseLeave={mouseLeaveEvent => { if (day && !today) mouseLeaveEvent.currentTarget.style.background = "transparent"; }}
            >
              {day || ""}
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
      .map(linkId => (activeWS?.docs || []).find(workspaceDoc => workspaceDoc.id === linkId))
      .filter(Boolean);
    const repeatOn   = Array.isArray(editing.repeat);
    const repeatDays = repeatOn ? editing.repeat : [];
    const endOn      = typeof editing.endDate === "string";
    const accent     = (allCals.find(calendar => calendar.calId === editing.calId) || allCals[0])?.color || theme.accent;

    const onCalChange = (changeEvent) => {
      const selectedCalId = changeEvent.target.value;
      if (selectedCalId === "__new__") {
        setNewCalConfirm({
          name:  `Calendar ${userCals.length + 1}`,
          color: NEW_CAL_COLORS[userCals.length % NEW_CAL_COLORS.length],
        });
        return;
      }
      setEditing(currentEditing => ({ ...currentEditing, calId: selectedCalId }));
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
        <div onClick={modalClickEvent => modalClickEvent.stopPropagation()} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radius10, padding: 22, width: 380, maxHeight: "88vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, fontFamily: theme.fontFamily }}>
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
            onChange={titleChangeEvent => setEditing(currentEditing => ({ ...currentEditing, title: titleChangeEvent.target.value }))}
            onKeyDown={titleKeyDownEvent => { if (titleKeyDownEvent.key === "Enter") applyAndClose(); }}
            style={field}
          />

          <input
            type="date"
            value={editing.date}
            onChange={dateChangeEvent => setEditing(currentEditing => ({ ...currentEditing, date: dateChangeEvent.target.value }))}
            style={{ ...field, flex: 1 }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="time" value={editing.time} title="Start time"
              onChange={timeChangeEvent => setEditing(currentEditing => ({ ...currentEditing, time: timeChangeEvent.target.value }))}
              style={{ ...field, flex: 1 }}
            />
            <span style={{ color: theme.textMuted, fontSize: 12 }}>→</span>
            <input
              type="time" value={editing.endTime} title="End time"
              onChange={endTimeChangeEvent => setEditing(currentEditing => ({ ...currentEditing, endTime: endTimeChangeEvent.target.value }))}
              style={{ ...field, flex: 1 }}
            />
          </div>

          <select value={editing.calId} onChange={onCalChange} style={{ ...field, padding: "9px 16px 9px 11px" }}>
            {allCals.map(calendar => <option key={calendar.calId} value={calendar.calId}>{calendar.name}</option>)}
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
                    onChange={endDateChangeEvent => setEditing(currentEditing => ({ ...currentEditing, endDate: endDateChangeEvent.target.value }))}
                    style={field}
                  />
                )}
              </div>
            )}
          </div>

          <textarea
            placeholder="Notes (optional)"
            value={editing.notes}
            onChange={notesChangeEvent => setEditing(currentEditing => ({ ...currentEditing, notes: notesChangeEvent.target.value }))}
            rows={3}
            style={{ ...field, resize: "vertical", minHeight: 60 }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 10, color: theme.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Linked documents
            </span>
            {linkedDocs.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {linkedDocs.map(linkedDoc => {
                  const appDef = registryU._app(linkedDoc.type);
                  return (
                    <button
                      key={linkedDoc.id}
                      type="button"
                      onClick={() => openLinkedDoc(linkedDoc)}
                      title={`Open ${linkedDoc.title}`}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: theme.radius6, padding: "5px 6px 5px 9px", fontSize: 12, color: theme.text, fontFamily: theme.fontFamily, cursor: "pointer", maxWidth: 200 }}
                    >
                      <appDef.Icon size={11} color={appDef.defaultColor} />
                      <span style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{linkedDoc.title}</span>
                      <span
                        role="button"
                        onClick={removeLinkClickEvent => {
                          removeLinkClickEvent.stopPropagation();
                          setEditing(currentEditing => ({
                            ...currentEditing,
                            links: currentEditing.links.filter(currentLinkId => currentLinkId !== linkedDoc.id),
                          }));
                        }}
                        style={{ display: "inline-flex", alignItems: "center", padding: 2, borderRadius: theme.radius6, color: theme.textMuted, cursor: "pointer" }}
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
    const trimmedName = newCalConfirm.name.trim();
    const confirmNewCalendar = () => {
      if (!trimmedName) return;
      const newCalendar = createCalendar(trimmedName, newCalConfirm.color);
      setEditing(currentEditing => ({ ...currentEditing, calId: newCalendar.calId }));
      setNewCalConfirm(null);
    };
    return (
      <div className="novl" onClick={overlayClickEvent => { if (overlayClickEvent.target === overlayClickEvent.currentTarget) setNewCalConfirm(null); }} style={{ zIndex: 600 }}>
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
              onChange={nameChangeEvent => setNewCalConfirm(currentConfirm => ({ ...currentConfirm, name: nameChangeEvent.target.value }))}
              onKeyDown={nameKeyDownEvent => {
                if (nameKeyDownEvent.key === "Enter") confirmNewCalendar();
                if (nameKeyDownEvent.key === "Escape") setNewCalConfirm(null);
              }}
              style={{ ...field, fontSize: 13, padding: "7px 9px" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 10, color: theme.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Color</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {NEW_CAL_COLORS.map(colorOption => {
                const isSelected = colorOption === newCalConfirm.color;
                return (
                  <button
                    key={colorOption}
                    type="button"
                    title={colorOption}
                    onClick={() => setNewCalConfirm(currentConfirm => ({ ...currentConfirm, color: colorOption }))}
                    style={{ width: 24, height: 24, borderRadius: "50%", background: colorOption, border: isSelected ? `2px solid ${theme.text}` : `2px solid transparent`, cursor: "pointer", padding: 0, outline: "none" }}
                  />
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4, justifyContent: "flex-end" }}>
            <button className="nb ng" onClick={() => setNewCalConfirm(null)} style={{ fontSize: 12, padding: "6px 14px" }}>No</button>
            <button className="nb np" onClick={confirmNewCalendar} disabled={!trimmedName} style={{ fontSize: 12, padding: "6px 14px", opacity: trimmedName ? 1 : 0.5 }}>
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
          <div style={{ display: "flex", gap: 2, background: theme.surfaceAlt, borderRadius: theme.radius6, padding: 2 }}>
            {CalendarConstants.VIEWS.map(viewName => (
              <button
                key={viewName}
                onClick={() => setView(viewName)}
                style={{
                  padding: "4px 12px", borderRadius: theme.radius6, border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: view === viewName ? 700 : 500,
                  background: view === viewName ? theme.surface : "transparent",
                  color: view === viewName ? theme.text : theme.textDim,
                  fontFamily: theme.fontFamily, textTransform: "capitalize",
                }}
              >
                {viewName}
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
            {allCals.map(calendar => {
              const isVisible = visible.has(calendar.calId);
              return (
                <button
                  key={calendar.calId}
                  onClick={() => toggleCal(calendar.calId)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", background: "transparent", border: "none", cursor: "pointer", borderRadius: theme.radius6, fontFamily: theme.fontFamily }}
                >
                  <span style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${isVisible ? calendar.color : theme.borderStrong}`, background: isVisible ? calendar.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {isVisible && <I.Check size={9} color="#fff" />}
                  </span>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: calendar.color, flexShrink: 0, opacity: isVisible ? 1 : 0.4 }} />
                  <span style={{ fontSize: 12, color: isVisible ? theme.text : theme.textDim, fontWeight: 500, textAlign: "left", flex: 1 }}>
                    {calendar.name}
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
          docs={(activeWS?.docs || []).filter(workspaceDoc => workspaceDoc.id !== doc.id)}
          selected={editing.links}
          onApply={(linkedDocIds) => {
            setEditing(currentEditing => ({ ...currentEditing, links: linkedDocIds }));
            setLinkPicker(false);
          }}
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
  const [searchQuery,    setSearchQuery]    = useState("");
  const [selectedDocIds, setSelectedDocIds] = useState(new Set(selected));
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const computeScore = (sourceText, queryText) => {
    if (!queryText) return 1;
    const lowerSource = sourceText.toLowerCase();
    const lowerQuery  = queryText.toLowerCase();
    if (lowerSource === lowerQuery) return 100;
    if (lowerSource.startsWith(lowerQuery)) return 80;
    if (lowerSource.includes(lowerQuery)) return 50;
    return 0;
  };

  const results = docs
    .map(workspaceDoc => ({ workspaceDoc, score: computeScore(workspaceDoc.title, searchQuery) }))
    .filter(scoredDoc => scoredDoc.score > 0)
    .sort((firstScored, secondScored) => secondScored.score - firstScored.score)
    .slice(0, 30);

  const toggle = (workspaceDocId) => setSelectedDocIds(currentSelected => {
    const nextSelected = new Set(currentSelected);
    if (nextSelected.has(workspaceDocId)) nextSelected.delete(workspaceDocId);
    else nextSelected.add(workspaceDocId);
    return nextSelected;
  });

  return (
    <div className="novl" onClick={overlayClickEvent => { if (overlayClickEvent.target === overlayClickEvent.currentTarget) onClose(); }} style={{ zIndex: 600 }}>
      <div style={{ background: theme.elevated, border: `1px solid ${theme.borderStrong}`, borderRadius: theme.radius20, width: "100%", maxWidth: 520, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.6)", animation: "popIn 0.15s ease", marginTop: "-10vh", display: "flex", flexDirection: "column", maxHeight: "70vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${theme.border}` }}>
          <I.Search size={16} color={theme.textDim} />
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={searchChangeEvent => setSearchQuery(searchChangeEvent.target.value)}
            onKeyDown={searchKeyDownEvent => {
              if (searchKeyDownEvent.key === "Escape") onClose();
              if (searchKeyDownEvent.key === "Enter")  onApply([...selectedDocIds]);
            }}
            placeholder="Search documents to link…"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 14, color: theme.text, fontFamily: theme.fontFamily }}
          />
          <span style={{ fontSize: 11, color: theme.textMuted, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: theme.radius6, padding: "2px 7px", fontWeight: 600 }}>
            {selectedDocIds.size} selected
          </span>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {results.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 12, color: theme.textMuted }}>
              {docs.length === 0 ? "No documents in this workspace yet" : `No documents match "${searchQuery}"`}
            </div>
          )}
          {results.map(({ workspaceDoc }) => {
            const appDef    = registryU._app(workspaceDoc.type);
            const isPicked  = selectedDocIds.has(workspaceDoc.id);
            return (
              <div
                key={workspaceDoc.id}
                onClick={() => toggle(workspaceDoc.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", margin: "0 4px", borderRadius: theme.radius10, cursor: "pointer", background: isPicked ? theme.surfaceAlt : "transparent", transition: "background 0.1s" }}
                onMouseEnter={mouseEnterEvent => { if (!isPicked) mouseEnterEvent.currentTarget.style.background = theme.surfaceShade; }}
                onMouseLeave={mouseLeaveEvent => { if (!isPicked) mouseLeaveEvent.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${isPicked ? theme.accent : theme.borderStrong}`, background: isPicked ? theme.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {isPicked && <I.Check size={11} color="#fff" />}
                </span>
                <div style={{ width: 28, height: 28, borderRadius: theme.radius6, background: theme.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <appDef.Icon size={13} color={appDef.defaultColor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {workspaceDoc.title}
                  </div>
                  <div style={{ fontSize: 11, color: theme.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {appDef.label}
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ height: 6 }} />
        </div>

        <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderTop: `1px solid ${theme.border}`, justifyContent: "flex-end" }}>
          <button className="nb ng" onClick={onClose} style={{ fontSize: 12, padding: "6px 14px" }}>Cancel</button>
          <button className="nb np" onClick={() => onApply([...selectedDocIds])} style={{ fontSize: 12, padding: "6px 14px" }}>
            <I.Check size={12} /> Apply
          </button>
        </div>
      </div>
    </div>
  );
};
