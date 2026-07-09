import { getDatePartsInTimezone } from "@/src/scheduling/timezone";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_MS = 24 * 60 * 60 * 1000;

function dateKey(date: Date, timeZone: string): string {
  const { year, month, day } = getDatePartsInTimezone(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Month-at-a-glance grid — server-rendered, no client JS. A dot marks days
 * with at least one appointment; both month navigation (?month=YYYY-MM) and
 * day selection (?day=YYYY-MM-DD, via dayHref) are plain links, same
 * URL-param-driven pattern as the receptionist's day/week nav.
 */
export function MonthCalendar({
  monthStart,
  today,
  dayCounts,
  timeZone,
  prevMonthHref,
  nextMonthHref,
  dayHref,
  selectedDayKey,
}: {
  monthStart: Date;
  today: Date;
  dayCounts: Record<string, number>;
  timeZone: string;
  prevMonthHref: string;
  nextMonthHref: string;
  dayHref: (key: string) => string;
  selectedDayKey?: string;
}) {
  const { year, month } = getDatePartsInTimezone(monthStart, timeZone);
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // day-of-week is a pure calendar-date function, timezone-irrelevant
  const gridStart = new Date(monthStart.getTime() - firstWeekday * DAY_MS);
  const todayKey = dateKey(today, timeZone);

  const cells = Array.from({ length: 42 }, (_, i) => {
    const cellDate = new Date(gridStart.getTime() + i * DAY_MS);
    const parts = getDatePartsInTimezone(cellDate, timeZone);
    const key = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
    return { key, day: parts.day, isOutside: parts.month !== month };
  });

  return (
    <div>
      <div className="month-calendar-nav">
        <a href={prevMonthHref}>← Prev</a>
        <span className="range">
          {monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone })}
        </span>
        <a href={nextMonthHref}>Next →</a>
      </div>
      <div className="month-calendar-grid">
        {WEEKDAY_LABELS.map((d) => (
          <div className="month-calendar-weekday" key={d}>
            {d}
          </div>
        ))}
        {cells.map((cell) => {
          const classes = `month-calendar-day ${cell.isOutside ? "outside" : ""} ${
            cell.key === todayKey ? "today" : ""
          } ${cell.key === selectedDayKey ? "selected" : ""}`;
          const dot = (dayCounts[cell.key] ?? 0) > 0 && <span className="month-calendar-dot" />;
          return cell.isOutside ? (
            <div key={cell.key} className={classes}>
              <span>{cell.day}</span>
              {dot}
            </div>
          ) : (
            <a key={cell.key} href={dayHref(cell.key)} className={classes}>
              <span>{cell.day}</span>
              {dot}
            </a>
          );
        })}
      </div>
    </div>
  );
}
