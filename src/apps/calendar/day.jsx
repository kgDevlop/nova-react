import React from "react";
import { I } from "../../shared/icons";
import { CalendarConstants } from "../../shared/_constants";
import { _ymd, EventChip } from "./shared";

export const DayView = ({ theme, appColor, cursor, expand, isToday, openNew, openEdit, calColor }) => {
  const ymd  = _ymd(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
  const list = expand(cursor, cursor)[ymd] || [];
  const t    = isToday(cursor.getDate());

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div
            style={{
              fontSize: 38,
              fontWeight: 800,
              color: t ? "#fff" : theme.text,
              background: t ? appColor : "transparent",
              width: t ? 56 : "auto",
              height: t ? 56 : "auto",
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
            {list.map(ev => (
              <EventChip key={ev.id} ev={ev} theme={theme} color={calColor(ev.calId)} onOpen={openEdit} />
            ))}
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
