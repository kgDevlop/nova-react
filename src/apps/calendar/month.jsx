import React from "react";
import { CalendarConstants } from "../../shared/_constants";
import { _ymd, buildMonthCells, EventChip } from "./shared";

export const MonthView = ({
  theme, appColor, year, month, eventsByDate, isToday,
  onCellSingleClick, onCellDoubleClick, openEdit, calColor, todayCellRef,
}) => {
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
          const dateStr   = day ? _ymd(year, month, day) : null;
          const dayEvents = dateStr ? (eventsByDate[dateStr] || []) : [];
          const today     = day && isToday(day);
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
                    fontWeight: today ? 700 : 500,
                    color: today ? "#fff" : theme.textDim,
                    width: CalendarConstants.TODAY_BADGE,
                    height: CalendarConstants.TODAY_BADGE,
                    borderRadius: "50%",
                    background: today ? appColor : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {day}
                </div>
              )}
              {dayEvents.map(ev => (
                <EventChip key={ev.id} ev={ev} theme={theme} color={calColor(ev.calId)} compact onOpen={openEdit} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
