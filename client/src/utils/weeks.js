// Weeks run Monday to Sunday, matching the backend so labels never drift.

// Returns the Monday (at midnight) of the week containing `date`.
export function mondayOf(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  // getDay() is 0 (Sun) - 6 (Sat); shift so Monday becomes the start of the week
  // instead of Sunday.
  const shift = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - shift);
  return day;
}

// Formats a Date (or date-like value) as "YYYY-MM-DD" for use in <input type="date">.
export function toInputDate(date) {
  const day = new Date(date);
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(day.getDate()).padStart(2, "0");
  return `${day.getFullYear()}-${month}-${dayOfMonth}`;
}

// Convenience helper: today's week-start (Monday), as an input-ready date string.
// Used as the default weekStart when starting a new report.
export function currentWeekValue() {
  return toInputDate(mondayOf(new Date()));
}

// Formats a week's start/end dates as a display range, e.g. "3 Jun - 9 Jun 2026".
// Only the end date shows the year, to keep the label compact.
export function weekRangeLabel(weekStart, weekEnd) {
  const options = { day: "numeric", month: "short" };
  const from = new Date(weekStart).toLocaleDateString(undefined, options);
  const to = new Date(weekEnd).toLocaleDateString(undefined, { ...options, year: "numeric" });
  return `${from} - ${to}`;
}

// Formats a timestamp for display in tables (e.g. "Last updated"), showing
// date and time. Returns "-" when no value is given.
export function shortDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}