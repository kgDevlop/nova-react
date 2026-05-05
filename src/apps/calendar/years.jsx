import React from "react";
import { CalendarConstants } from "../../shared/_constants";
import { _ymd, buildMonthCells } from "./shared";

const MiniMonthCard = ({ y: year, m: monthIndex, theme, appColor, now, map: eventsByDate, calColor, onPick, isCurrent, refProp }) => {
  const cells = buildMonthCells(year, monthIndex);
  return (
    <div
      ref={refProp}
      onClick={() => onPick(year, monthIndex)}
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius10,
        padding: 10,
        cursor: "pointer",
        fontFamily: theme.fontFamily,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 8 }}>
        {CalendarConstants.MONTHS[monthIndex]}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1 }}>
        {CalendarConstants.DAYS_MINI.map((dayInitial, dayInitialIndex) => (
          <div
            key={`yh-${dayInitialIndex}`}
            style={{
              fontSize: 9,
              color: theme.textMuted,
              textAlign: "center",
              fontWeight: 600,
              padding: "2px 0",
            }}
          >
            {dayInitial}
          </div>
        ))}
        {cells.map((day, cellIndex) => {
          const dateString  = day ? _ymd(year, monthIndex, day) : null;
          const dayEvents   = dateString ? (eventsByDate[dateString] || []) : [];
          const isCurrentDay =
            day != null &&
            day === now.getDate() &&
            monthIndex === now.getMonth() &&
            year === now.getFullYear();
          return (
            <div
              key={`yc-${cellIndex}`}
              style={{
                height: 26,
                fontSize: 10,
                fontWeight: isCurrentDay ? 700 : 500,
                color: isCurrentDay ? "#fff" : day ? theme.text : "transparent",
                background: isCurrentDay ? appColor : "transparent",
                borderRadius: "50%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {day || ""}
              {dayEvents.length > 0 && (
                <div style={{ display: "flex", gap: 1, position: "absolute", bottom: 1 }}>
                  {dayEvents.slice(0, 3).map((event, eventIndex) => (
                    <span
                      key={eventIndex}
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: "50%",
                        background: calColor(event.calId),
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

export const YearView = ({ theme, appColor, year, now, expand, calColor, onPickMonth, todayMonthCardRef }) => (
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
    {Array.from({ length: 12 }, (_, monthIndex) => {
      const isCurrent     = year === now.getFullYear() && monthIndex === now.getMonth();
      const eventsByDate  = expand(new Date(year, monthIndex, 1), new Date(year, monthIndex + 1, 0));
      return (
        <MiniMonthCard
          key={`mm-${year}-${monthIndex}`}
          y={year}
          m={monthIndex}
          theme={theme}
          appColor={appColor}
          now={now}
          map={eventsByDate}
          calColor={calColor}
          onPick={onPickMonth}
          isCurrent={isCurrent}
          refProp={isCurrent ? todayMonthCardRef : null}
        />
      );
    })}
  </div>
);
