import React, { useState, useEffect } from "react";
import { I } from "../shared/icons";
import { AppsSidebar, AppsSidebarSection, DefaultSections } from "../shared/apps_sidebar";
import { calendar as C } from "../shared/_constants";

// Build a 6×7 month grid (null-padded) so the layout never reflows.
const buildMonthCells = (year, month) => {
  const firstDow = new Date(year, month, 1).getDay();
  const daysIn   = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: 42 }, (_, i) => {
    const d = i - firstDow + 1;
    return d < 1 || d > daysIn ? null : d;
  });
};

export const CalendarEditor = ({ appColor, doc, t: theme, registerActions }) => {
  const now = new Date();
  const [view,    setView]    = useState("month");
  const [cursor,  setCursor]  = useState(now);
  const [visible, setVisible] = useState(() => new Set(C.CALENDARS.map(c => c.id)));

  const year  = cursor.getFullYear();
  const month = cursor.getMonth();

  const shiftMonth = dir => {
    setCursor(c => {
      const d = new Date(c);
      d.setMonth(d.getMonth() + dir);
      return d;
    });
  };

  const toggleCal = id => {
    setVisible(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const isToday = day =>
    day === now.getDate() && month === now.getMonth() && year === now.getFullYear();

  // Wire toolbar buttons (today/prev/next/view); "new" is a no-op for now.
  useEffect(() => {
    registerActions?.((id, val) => {
      if (id === "today")       setCursor(new Date());
      if (id === "prev")        shiftMonth(-1);
      if (id === "next")        shiftMonth(1);
      if (id === "view" && val) setView(val);
    });
  }, []); // eslint-disable-line

  // ── Mini month (sidebar) ────────────────────────────────────────────────

  const renderMiniMonth = () => {
    const cells = buildMonthCells(year, month);
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1 }}>
        {C.DAYS_MINI.map((d, i) => (
          <div
            key={i}
            style={{
              fontSize: 9,
              color: theme.tm,
              textAlign: "center",
              fontWeight: 600,
              padding: "2px 0",
            }}
          >
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          const today = d != null && isToday(d);
          return (
            <div
              key={i}
              style={{
                height: 18,
                fontSize: 10,
                fontWeight: today ? 700 : 500,
                color: today ? "#fff" : d ? theme.tx : "transparent",
                background: today ? appColor : "transparent",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {d || ""}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Month grid (main view) ──────────────────────────────────────────────

  const renderMonthGrid = () => {
    const cells = buildMonthCells(year, month);
    return (
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gap: 1,
            background: theme.bd,
            border: `1px solid ${theme.bd}`,
          }}
        >
          {C.DAYS.map(d => (
            <div
              key={d}
              style={{
                background: theme.surface,
                padding: "6px 0",
                textAlign: "center",
                fontSize: 11,
                fontWeight: 600,
                color: theme.ts,
              }}
            >
              {d}
            </div>
          ))}
          {cells.map((day, i) => (
            <div
              key={i}
              style={{
                background: theme.surface,
                minHeight: C.CELL_MIN_H,
                padding: 5,
              }}
            >
              {day && (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: isToday(day) ? 700 : 500,
                    color: isToday(day) ? "#fff" : theme.ts,
                    width: C.TODAY_BADGE,
                    height: C.TODAY_BADGE,
                    borderRadius: "50%",
                    background: isToday(day) ? appColor : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {day}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden", minHeight: 0 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* View header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderBottom: `1px solid ${theme.bd}`,
            flexShrink: 0,
          }}
        >
          <h2 style={{ fontSize: 17, fontWeight: 800, color: theme.tx, marginRight: 6 }}>
            {C.MONTHS[month]} {year}
          </h2>
          <button className="nb ni" style={{ padding: 5 }} onClick={() => shiftMonth(-1)}>
            <I.ChevLeft size={13} />
          </button>
          <button className="nb ni" style={{ padding: 5 }} onClick={() => shiftMonth(1)}>
            <I.ChevRight size={13} />
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 2, background: theme.sa, borderRadius: theme.r6, padding: 2 }}>
            {C.VIEWS.map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "4px 12px",
                  borderRadius: theme.r6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: view === v ? 700 : 500,
                  background: view === v ? theme.surface : "transparent",
                  color: view === v ? theme.tx : theme.ts,
                  fontFamily: theme.fn,
                  textTransform: "capitalize",
                }}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            className="nb ng"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={() => setCursor(new Date())}
          >
            Today
          </button>
          <button className="nb np" style={{ fontSize: 11, padding: "4px 10px" }}>
            <I.Plus size={11} /> New event
          </button>
        </div>

        {renderMonthGrid()}
      </div>

      {/* Right sidebar */}
      <AppsSidebar doc={doc} appColor={appColor}>
        <AppsSidebarSection title="My Calendars" icon={I.Calendar}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {C.CALENDARS.map(c => {
              const on = visible.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCal(c.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "5px 4px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: theme.r6,
                    fontFamily: theme.fn,
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      border: `1.5px solid ${on ? c.color : theme.bs}`,
                      background: on ? c.color : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {on && <I.Check size={9} color="#fff" />}
                  </span>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: c.color,
                      flexShrink: 0,
                      opacity: on ? 1 : 0.4,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: on ? theme.tx : theme.ts,
                      fontWeight: 500,
                      textAlign: "left",
                      flex: 1,
                    }}
                  >
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        </AppsSidebarSection>

        <AppsSidebarSection title={`${C.MONTHS[month]} ${year}`} icon={I.Calendar}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <div style={{ flex: 1, fontSize: 11, color: theme.ts, fontWeight: 600 }}>
              Jump to date
            </div>
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
    </div>
  );
};
