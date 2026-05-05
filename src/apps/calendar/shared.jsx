import React from "react";
import { CalendarConstants } from "../../shared/_constants";

export const NEW_CAL_COLORS = ["#F59E0B", "#EC4899", "#22D3EE", "#A78BFA", "#34D399", "#FB7185", "#818CF8"];

// 6×7 month grid (null-padded) so the layout never reflows.
export const buildMonthCells = (year, month) => {
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth    = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: 42 }, (_, cellIndex) => {
    const dayOfMonth = cellIndex - firstDayOfWeek + 1;
    return dayOfMonth < 1 || dayOfMonth > daysInMonth ? null : dayOfMonth;
  });
};

export const _ymd = (year, monthIndex, dayOfMonth) =>
  `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}`;

// "HH:MM" (24hr, the form input format) → "h:mm AM/PM" for display.
export const _fmtTime = (timeString) => {
  if (!timeString) return "";
  const [hour24, minute] = timeString.split(":").map(Number);
  if (Number.isNaN(hour24) || Number.isNaN(minute)) return timeString;
  const meridian   = hour24 < 12 ? "AM" : "PM";
  const hour12     = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  return `${hour12}:${String(minute).padStart(2, "0")} ${meridian}`;
};

const _normEvents = (rawEvents) => rawEvents
  .filter(rawEvent => rawEvent && typeof rawEvent.id === "string" && typeof rawEvent.date === "string")
  .map(rawEvent => ({
    id:      rawEvent.id,
    calId:   typeof rawEvent.calId === "string" ? rawEvent.calId : CalendarConstants.CALENDARS[0].calId,
    title:   typeof rawEvent.title === "string" ? rawEvent.title : "",
    date:    rawEvent.date,
    time:    typeof rawEvent.time    === "string" ? rawEvent.time    : "",
    endTime: typeof rawEvent.endTime === "string" ? rawEvent.endTime : "",
    notes:   typeof rawEvent.notes   === "string" ? rawEvent.notes   : "",
    links:   Array.isArray(rawEvent.links) ? rawEvent.links.filter(linkId => typeof linkId === "string") : [],
    // null = scheduling off; array = scheduling on with selected weekdays.
    repeat:  Array.isArray(rawEvent.repeat)
      ? rawEvent.repeat.filter(weekday => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6)
      : null,
    // null = no end date; "" or "YYYY-MM-DD" once user enables the cap.
    endDate: typeof rawEvent.endDate === "string" ? rawEvent.endDate : null,
  }));

const _normCalendars = (rawCalendars) => rawCalendars
  .filter(rawCalendar =>
    rawCalendar
    && typeof rawCalendar.calId === "string"
    && typeof rawCalendar.name === "string"
    && typeof rawCalendar.color === "string",
  );

export const _parseDoc = (content) => {
  try {
    const parsed = JSON.parse(content || "{}");
    if (Array.isArray(parsed)) return { events: _normEvents(parsed), calendars: [] };
    return {
      events:    Array.isArray(parsed.events)    ? _normEvents(parsed.events)       : [],
      calendars: Array.isArray(parsed.calendars) ? _normCalendars(parsed.calendars) : [],
    };
  } catch {
    return { events: [], calendars: [] };
  }
};

// Expand `events` into a `{ ymd → events[] }` map for the [windowStart,windowEnd] window.
// Honors weekday schedule + optional end-date cap + calendar visibility.
export const expandEvents = (events, visibleCalendars, windowStart, windowEnd) => {
  const eventsByDate = {};
  const pushEvent = (dateString, event) =>
    (eventsByDate[dateString] = eventsByDate[dateString] || []).push(event);

  for (const event of events) {
    if (!visibleCalendars.has(event.calId)) continue;
    const startDate     = new Date(`${event.date}T00:00:00`);
    const endDateCap    = event.endDate ? new Date(`${event.endDate}T00:00:00`) : null;
    const isRecurring   = Array.isArray(event.repeat) && event.repeat.length > 0;

    if (startDate >= windowStart && startDate <= windowEnd && (!endDateCap || startDate <= endDateCap)) {
      pushEvent(event.date, event);
    }
    if (!isRecurring) continue;

    for (const cursor = new Date(windowStart); cursor <= windowEnd; cursor.setDate(cursor.getDate() + 1)) {
      const cursorYmd = _ymd(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
      if (
        cursorYmd !== event.date
        && cursor >= startDate
        && (!endDateCap || cursor <= endDateCap)
        && event.repeat.includes(cursor.getDay())
      ) {
        pushEvent(cursorYmd, event);
      }
    }
  }
  Object.values(eventsByDate).forEach(eventList =>
    eventList.sort((firstEvent, secondEvent) =>
      (firstEvent.time || "99:99").localeCompare(secondEvent.time || "99:99"),
    ),
  );
  return eventsByDate;
};

// Single event chip, reused by every view. The parent passes the resolved
// calendar color so the chip stays a leaf component.
export const EventChip = ({ ev, theme, color, compact = false, onOpen }) => (
  <button
    onClick={chipClickEvent => { chipClickEvent.stopPropagation(); onOpen(ev); }}
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
