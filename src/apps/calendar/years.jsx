import React from "react";
import { CalendarConstants } from "../../shared/_constants";
import { _ymd, buildMonthCells } from "./shared";

const MiniMonthCard = ({ y, m, theme, appColor, now, map, calColor, onPick, isCurrent, refProp }) => {
  const cells = buildMonthCells(y, m);
  return (
    <div
      ref={refProp}
      onClick={() => onPick(y, m)}
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: theme.r10,
        padding: 10,
        cursor: "pointer",
        fontFamily: theme.fontFamily,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 8 }}>
        {CalendarConstants.MONTHS[m]}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1 }}>
        {CalendarConstants.DAYS_MINI.map((d, i) => (
          <div
            key={`yh-${i}`}
            style={{
              fontSize: 9,
              color: theme.textMuted,
              textAlign: "center",
              fontWeight: 600,
              padding: "2px 0",
            }}
          >
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          const ymd    = d ? _ymd(y, m, d) : null;
          const dayEvs = ymd ? (map[ymd] || []) : [];
          const isT =
            d != null &&
            d === now.getDate() &&
            m === now.getMonth() &&
            y === now.getFullYear();
          return (
            <div
              key={`yc-${i}`}
              style={{
                height: 26,
                fontSize: 10,
                fontWeight: isT ? 700 : 500,
                color: isT ? "#fff" : d ? theme.text : "transparent",
                background: isT ? appColor : "transparent",
                borderRadius: "50%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {d || ""}
              {dayEvs.length > 0 && (
                <div style={{ display: "flex", gap: 1, position: "absolute", bottom: 1 }}>
                  {dayEvs.slice(0, 3).map((ev, k) => (
                    <span
                      key={k}
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: "50%",
                        background: calColor(ev.calId),
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
    {Array.from({ length: 12 }, (_, m) => {
      const isCurrent = year === now.getFullYear() && m === now.getMonth();
      const map = expand(new Date(year, m, 1), new Date(year, m + 1, 0));
      return (
        <MiniMonthCard
          key={`mm-${year}-${m}`}
          y={year}
          m={m}
          theme={theme}
          appColor={appColor}
          now={now}
          map={map}
          calColor={calColor}
          onPick={onPickMonth}
          isCurrent={isCurrent}
          refProp={isCurrent ? todayMonthCardRef : null}
        />
      );
    })}
  </div>
);
