import React from "react";
import { CalendarConstants } from "../../shared/_constants";

export const NEW_CAL_COLORS = ["#F59E0B", "#EC4899", "#22D3EE", "#A78BFA", "#34D399", "#FB7185", "#818CF8"];

// 6×7 month grid (null-padded) so the layout never reflows.
export const buildMonthCells = (year, month) => {
  const firstDow = new Date(year, month, 1).getDay();
  const daysIn   = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: 42 }, (_, i) => {
    const d = i - firstDow + 1;
    return d < 1 || d > daysIn ? null : d;
  });
};

export const _ymd = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// "HH:MM" (24hr, the form input format) → "h:mm AM/PM" for display.
export const _fmtTime = (hhmm) => {
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
    calId:   typeof e.calId === "string" ? e.calId : CalendarConstants.CALENDARS[0].calId,
    title:   typeof e.title === "string" ? e.title : "",
    date:    e.date,
    time:    typeof e.time    === "string" ? e.time    : "",
    endTime: typeof e.endTime === "string" ? e.endTime : "",
    notes:   typeof e.notes   === "string" ? e.notes   : "",
    links:   Array.isArray(e.links) ? e.links.filter(x => typeof x === "string") : [],
    // null = scheduling off; array = scheduling on with selected weekdays.
    repeat:  Array.isArray(e.repeat)
      ? e.repeat.filter(n => Number.isInteger(n) && n >= 0 && n <= 6)
      : null,
    // null = no end date; "" or "YYYY-MM-DD" once user enables the cap.
    endDate: typeof e.endDate === "string" ? e.endDate : null,
  }));

const _normCalendars = (arr) => arr
  .filter(c => c && typeof c.calId === "string" && typeof c.name === "string" && typeof c.color === "string");

export const _parseDoc = (content) => {
  try {
    const p = JSON.parse(content || "{}");
    if (Array.isArray(p)) return { events: _normEvents(p), calendars: [] };
    return {
      events:    Array.isArray(p.events)    ? _normEvents(p.events)       : [],
      calendars: Array.isArray(p.calendars) ? _normCalendars(p.calendars) : [],
    };
  } catch {
    return { events: [], calendars: [] };
  }
};

// Expand `events` into a `{ ymd → events[] }` map for the [from,to] window.
// Honors weekday schedule + optional end-date cap + calendar visibility.
export const expandEvents = (events, visible, from, to) => {
  const out = {};
  const push = (ymd, ev) => (out[ymd] = out[ymd] || []).push(ev);
  for (const e of events) {
    if (!visible.has(e.calId)) continue;
    const start  = new Date(`${e.date}T00:00:00`);
    const cap    = e.endDate ? new Date(`${e.endDate}T00:00:00`) : null;
    const recurs = Array.isArray(e.repeat) && e.repeat.length > 0;

    if (start >= from && start <= to && (!cap || start <= cap)) {
      push(e.date, e);
    }
    if (!recurs) continue;

    const cur = new Date(from);
    while (cur <= to) {
      const ymd = _ymd(cur.getFullYear(), cur.getMonth(), cur.getDate());
      if (ymd !== e.date && cur >= start && (!cap || cur <= cap) && e.repeat.includes(cur.getDay())) {
        push(ymd, e);
      }
      cur.setDate(cur.getDate() + 1);
    }
  }
  Object.values(out).forEach(list =>
    list.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99")));
  return out;
};

// Single event chip, reused by every view. The parent passes the resolved
// calendar color so the chip stays a leaf component.
export const EventChip = ({ ev, theme, color, compact = false, onOpen }) => (
  <button
    onClick={e => { e.stopPropagation(); onOpen(ev); }}
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
