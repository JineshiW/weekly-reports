// Weeks always run Monday to Sunday so every report lines up on the dashboard.

// Returns midnight UTC of the Monday for the week containing `date`.
function startOfWeek(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  // getUTCDay() is 0 (Sun) - 6 (Sat); shift so Monday becomes the start of
  // the week instead of Sunday.
  const shift = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - shift);
  return d;
}

// Returns the last instant (23:59:59.999 UTC) of the Sunday ending that week.
function endOfWeek(date) {
  const d = startOfWeek(date);
  d.setUTCDate(d.getUTCDate() + 6);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

// Shifts a date forward (or backward, with a negative count) by whole weeks.
function addWeeks(date, count) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + count * 7);
  return d;
}

// Canonical string key for a week, used to group/compare weeks (e.g. in the
// dashboard trend) regardless of what time of day `date` falls on.
function weekLabel(date) {
  return startOfWeek(date).toISOString().slice(0, 10);
}

module.exports = { startOfWeek, endOfWeek, addWeeks, weekLabel };