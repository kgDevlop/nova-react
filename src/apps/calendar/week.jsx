import React from "react";
import { CalendarConstants } from "../../shared/_constants";
import { _ymd, EventChip } from "./shared";

export const WeekView = ({
  theme, appColor, cursor, now, expand,
  onCellSingleClick, onCellDoubleClick, openEdit, calColor,
}) => {
  const weekStart = new Date(cursor);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const eventsByDate = expand(weekStart, weekEnd);
  const days = Array.from({ length: 7 }, (_, dayOffset) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(dayDate.getDate() + dayOffset);
    return dayDate;
  });

  const isToday = candidateDate =>
    candidateDate.getDate() === now.getDate() &&
    candidateDate.getMonth() === now.getMonth() &&
    candidateDate.getFullYear() === now.getFullYear();

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
        {days.map(dayDate => {
          const isCurrentDay = isToday(dayDate);
          return (
            <div
              key={`h-${dayDate.getTime()}`}
              style={{
                background: theme.surface,
                padding: "8px 6px",
                textAlign: "center",
                fontSize: 11,
                fontWeight: 600,
                color: theme.textDim,
              }}
            >
              {CalendarConstants.DAYS[dayDate.getDay()]}
              <div
                style={{
                  marginTop: 4,
                  fontSize: 16,
                  fontWeight: 700,
                  color: isCurrentDay ? "#fff" : theme.text,
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: isCurrentDay ? appColor : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "4px auto 0",
                }}
              >
                {dayDate.getDate()}
              </div>
            </div>
          );
        })}
        {days.map(dayDate => {
          const dateString = _ymd(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
          const dayEvents  = eventsByDate[dateString] || [];
          return (
            <div
              key={`c-${dayDate.getTime()}`}
              onClick={() => onCellSingleClick(dateString)}
              onDoubleClick={() => onCellDoubleClick(dateString)}
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
              {dayEvents.map(event => (
                <EventChip key={event.id} ev={event} theme={theme} color={calColor(event.calId)} compact onOpen={openEdit} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
