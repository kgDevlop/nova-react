import React from "react";
import { I } from "../../shared/icons";
import { CalendarConstants } from "../../shared/_constants";
import { _ymd, EventChip } from "./shared";

export const DayView = ({ theme, appColor, cursor, expand, isToday, openNew, openEdit, calColor }) => {
  const dateString  = _ymd(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
  const dayEvents   = expand(cursor, cursor)[dateString] || [];
  const isCurrentDay = isToday(cursor.getDate());

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div
            style={{
              fontSize: 38,
              fontWeight: 800,
              color: isCurrentDay ? "#fff" : theme.text,
              background: isCurrentDay ? appColor : "transparent",
              width: isCurrentDay ? 56 : "auto",
              height: isCurrentDay ? 56 : "auto",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            {cursor.getDate()}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: theme.text, letterSpacing: "-0.01em" }}>
            {CalendarConstants.DAYS_LONG[cursor.getDay()]}, {CalendarConstants.MONTHS[cursor.getMonth()]} {cursor.getDate()}, {cursor.getFullYear()}
          </div>
        </div>

        {dayEvents.length === 0 ? (
          <div
            onClick={() => openNew(dateString)}
            style={{
              padding: 24,
              border: `1px dashed ${theme.border}`,
              borderRadius: theme.radius10,
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
            {dayEvents.map(event => (
              <EventChip key={event.id} ev={event} theme={theme} color={calColor(event.calId)} onOpen={openEdit} />
            ))}
            <button
              className="nb ng"
              onClick={() => openNew(dateString)}
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
