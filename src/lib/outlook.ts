// The 48-hour street outlook: which hours have planned or live disruption, built from records and the rain forecast.
import { isLiveOutage, type Cluster, type Notice } from "@/lib/issues";
import { waterloggingRisk, type RainHour } from "@/lib/forecast";

export type Level = 0 | 1 | 2;
export type Row = { key: "power" | "water" | "road" | "rain"; label: string; color: string; cells: Level[]; notes: string[] };
export type Outlook = { hours: Date[]; rows: Row[]; items: { when: [Date, Date | null]; what: string; who: string; demo: boolean; source: string | null; kind: Row["key"] }[]; rainAvailable: boolean };

const HOURS = 48;

export function buildOutlook(clusters: Cluster[], notices: Notice[], rain: RainHour[] | null, history: number, now = new Date()): Outlook {
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  const hours = Array.from({ length: HOURS }, (_, i) => new Date(start.getTime() + i * 3_600_000));
  const end = hours[HOURS - 1].getTime() + 3_600_000;
  const rows: Record<Row["key"], Row> = {
    power: { key: "power", label: "Power", color: "var(--outage)", cells: Array(HOURS).fill(0), notes: [] },
    water: { key: "water", label: "Water", color: "var(--water)", cells: Array(HOURS).fill(0), notes: [] },
    road: { key: "road", label: "Road works", color: "var(--works)", cells: Array(HOURS).fill(0), notes: [] },
    rain: { key: "rain", label: "Waterlogging", color: "var(--pothole)", cells: Array(HOURS).fill(0), notes: [] },
  };
  const items: Outlook["items"] = [];
  const mark = (row: Row, from: number, to: number, level: Level) => {
    hours.forEach((h, i) => {
      const t = h.getTime();
      if (t + 3_600_000 > from && t < to) row.cells[i] = Math.max(row.cells[i], level) as Level;
    });
  };

  for (const n of notices) {
    // mapped construction has no dates: it is ongoing, so it shades the road row at a lower level for the whole window
    if (n.kind === "works") { mark(rows.road, now.getTime(), end, 1); continue; }
    const from = new Date(n.starts_at).getTime();
    const to = n.ends_at ? new Date(n.ends_at).getTime() : from + 4 * 3_600_000;
    if (to < now.getTime() || from > end) continue;
    const row = n.kind === "power_shutdown" ? rows.power : n.kind === "water_suspension" ? rows.water : n.kind === "road_permit" ? rows.road : null;
    if (!row) continue;
    mark(row, from, to, 2);
    items.push({ when: [new Date(from), n.ends_at ? new Date(to) : null], what: n.title, who: n.agency, demo: n.provenance === "demo", source: n.source_url, kind: row.key });
  }
  for (const c of clusters) {
    if (isLiveOutage(c)) {
      mark(rows.power, new Date(c.first_reported_at).getTime(), now.getTime() + 2 * 3_600_000, 2);
      items.push({ when: [new Date(c.first_reported_at), null], what: `Power cut reported by ${c.reporter_count} ${c.reporter_count === 1 ? "resident" : "residents"}`, who: "Resident reports", demo: c.demo, source: null, kind: "power" });
    }
    if (c.kind === "worksite" && c.status === "open") mark(rows.road, now.getTime(), end, 1);
  }
  if (rain) {
    let streak: { from: Date; to: Date; level: Level } | null = null;
    hours.forEach((h, i) => {
      const r = rain.find((x) => new Date(x.time).getTime() === h.getTime());
      const risk = r ? waterloggingRisk(r.mm, history) : "low";
      const level: Level = risk === "high" ? 2 : risk === "moderate" ? 1 : 0;
      rows.rain.cells[i] = level;
      if (level === 2) {
        if (streak) streak.to = new Date(h.getTime() + 3_600_000);
        else streak = { from: h, to: new Date(h.getTime() + 3_600_000), level };
      } else if (streak) {
        items.push({ when: [streak.from, streak.to], what: `Heavy rain forecast; waterlogging risk is high${history ? ` (${history} earlier report${history === 1 ? "" : "s"} nearby)` : ""}`, who: "Open-Meteo forecast", demo: false, source: "https://open-meteo.com", kind: "rain" });
        streak = null;
      }
    });
    if (streak) {
      const s: { from: Date; to: Date } = streak;
      items.push({ when: [s.from, s.to], what: "Heavy rain forecast; waterlogging risk is high", who: "Open-Meteo forecast", demo: false, source: "https://open-meteo.com", kind: "rain" });
    }
  }
  items.sort((a, b) => a.when[0].getTime() - b.when[0].getTime());
  return { hours, rows: [rows.power, rows.water, rows.road, rows.rain], items, rainAvailable: !!rain };
}
