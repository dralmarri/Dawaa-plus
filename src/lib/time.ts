/**
 * Format a stored 24-hour "HH:mm" time for display in 12-hour form with an
 * explicit morning/evening marker, e.g. "23:00" → "11:00 مساءً" / "11:00 PM".
 * Times are still stored as "HH:mm"; this is display-only.
 */
export function formatTime12(hhmm: string | undefined, isArabic: boolean): string {
  if (!hhmm) return "";
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const isPm = h >= 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const clock = `${h12}:${String(m).padStart(2, "0")}`;
  if (isArabic) return `${clock} ${isPm ? "مساءً" : "صباحاً"}`;
  return `${clock} ${isPm ? "PM" : "AM"}`;
}

/** Format a list of "HH:mm" times. */
export function formatTimes(times: string[], isArabic: boolean, separator?: string): string {
  return times.map((t) => formatTime12(t, isArabic)).join(separator ?? (isArabic ? "، " : ", "));
}
