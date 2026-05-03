import React from "react";
import { CalendarConstants } from "../../shared/_constants";
import { _ymd, EventChip } from "./shared";

export const WeekView = ({
  theme, appColor, cursor, now, expand,
  onCellSingleClick, onCellDoubleClick, openEdit, calColor,
}) => {
  const start = new Date(cursor);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const map  = expand(start, end);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });

  const isToday = d =>
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

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
        {days.map(d => {
          const t = isToday(d);
          return (
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
                  color: t ? "#fff" : theme.text,
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: t ? appColor : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "4px auto 0",
                }}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
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
              {list.map(ev => (
                <EventChip key={ev.id} ev={ev} theme={theme} color={calColor(ev.calId)} compact onOpen={openEdit} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
