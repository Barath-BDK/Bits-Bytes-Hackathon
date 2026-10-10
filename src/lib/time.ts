// Everything is shown in Indian Standard Time, whatever timezone the server runs in.
const TZ = "Asia/Kolkata";

export function istParts(d: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour };
}

export function istDayKey(d: Date) {
  const p = istParts(d);
  return `${p.y}-${p.m}-${p.d}`;
}

export function dayWord(d: Date, now = new Date()) {
  const k = istDayKey(d);
  if (k === istDayKey(now)) return "Today";
  if (k === istDayKey(new Date(now.getTime() + 86_400_000))) return "Tomorrow";
  const ahead = d.getTime() - now.getTime();
  // a weekday name only makes sense within the coming week; otherwise give the date
  if (ahead > 0 && ahead < 6 * 86_400_000) return new Intl.DateTimeFormat("en-IN", { timeZone: TZ, weekday: "long" }).format(d);
  return new Intl.DateTimeFormat("en-IN", { timeZone: TZ, day: "numeric", month: "short" }).format(d);
}

export function hhmm(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
}

export function dayMonth(d: Date) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(d);
}

// "Tomorrow 09:00 to 14:00" or "Today 22:00 to Tomorrow 06:00"
export function span(start: Date, end: Date | null, now = new Date()) {
  const a = `${dayWord(start, now)} ${hhmm(start)}`;
  if (!end) return `from ${a}`;
  const same = istDayKey(start) === istDayKey(end);
  return `${a} to ${same ? "" : dayWord(end, now) + " "}${hhmm(end)}`;
}

export function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

// Dated notices in force now or starting within the next `hours`, soonest first.
export function inForceOrSoon<T extends { starts_at: string; ends_at: string | null }>(notices: T[], hours = 48): T[] {
  const now = Date.now(), horizon = now + hours * 3_600_000;
  return notices
    .filter((n) => n.ends_at && new Date(n.ends_at).getTime() > now && new Date(n.starts_at).getTime() < horizon)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}
