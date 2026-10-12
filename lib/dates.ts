const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Parses YYYY-MM-DD as a calendar date (no time zone shift). */
export function parseDay(d: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return null;
  const date = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDay(d: string) {
  const dt = parseDay(d);
  return dt ? `${DAYS[dt.getUTCDay()]}, ${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}` : d;
}

export function dayParts(d: string) {
  const dt = parseDay(d);
  return dt ? { day: dt.getUTCDate(), month: MONTHS[dt.getUTCMonth()] } : null;
}
