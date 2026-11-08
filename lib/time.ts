const pad = (n: number) => String(n).padStart(2, "0");

/** epoch ms -> value for <input type="datetime-local"> in the viewer's timezone. */
export function toInput(ms: number | null | undefined) {
  if (!ms) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value -> epoch ms (null when empty). */
export function fromInput(v: FormDataEntryValue | null | undefined) {
  if (!v || typeof v !== "string") return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
}

export const dateTime = (ms: number | null | undefined) =>
  ms ? new Date(ms).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

export const date = (ms: number | null | undefined) => (ms ? new Date(ms).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "");

export const time = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export function timeRange(start: number, end: number) {
  const sameDay = new Date(start).toDateString() === new Date(end).toDateString();
  return sameDay ? `${dateTime(start)} – ${time(end)}` : `${dateTime(start)} – ${dateTime(end)}`;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000_000], ["month", 2_592_000_000], ["week", 604_800_000], ["day", 86_400_000], ["hour", 3_600_000], ["minute", 60_000],
];
const rtf = typeof Intl !== "undefined" ? new Intl.RelativeTimeFormat([], { numeric: "auto" }) : null;

export function relative(ms: number, now = Date.now()) {
  const diff = ms - now;
  for (const [unit, size] of UNITS) if (Math.abs(diff) >= size || unit === "minute") return rtf?.format(Math.round(diff / size), unit) ?? dateTime(ms);
  return "";
}
