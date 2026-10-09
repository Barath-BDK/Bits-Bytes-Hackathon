// Shared, client-safe types and wording for issues.

export type Kind = "pothole" | "waterlogging" | "worksite" | "outage";

export type Cluster = {
  id: string;
  kind: Kind;
  status: "open" | "resolved";
  lat: number;
  lng: number;
  report_count: number;
  reporter_count: number;
  severity_max: 1 | 2 | 3;
  department: string | null;
  promised_end: string | null;
  first_reported_at: string;
  last_reported_at: string;
  near_worksite: boolean;
  priority: number;
  cover_photo: string | null;
  demo: boolean;
};

export type NoticeKind = "road_permit" | "completion" | "resurfacing" | "power_shutdown" | "water_suspension" | "incident";
export type Provenance = "official" | "news" | "community" | "demo";

export type Notice = {
  id: string; kind: NoticeKind; agency: string; title: string; area_text: string | null; lat: number; lng: number; radius_m: number;
  starts_at: string; ends_at: string | null; reference: string | null; source_name: string; source_url: string | null;
  provenance: Provenance; imported_at: string;
};

export type Finding = {
  id: string; type: string; label: string; title: string; explanation: string; lat: number; lng: number;
  refs: Record<string, unknown>; detected_at: string; demo: boolean;
};

export const NOTICE_KINDS: Record<NoticeKind, { label: string; color: string }> = {
  road_permit: { label: "Road-cutting permission", color: "var(--works)" },
  completion: { label: "Completion record", color: "var(--ok)" },
  resurfacing: { label: "Resurfacing record", color: "var(--fg-2)" },
  power_shutdown: { label: "Planned power shutdown", color: "var(--outage)" },
  water_suspension: { label: "Water supply suspension", color: "var(--water)" },
  incident: { label: "Reported incident", color: "var(--alert)" },
};

export const PROVENANCE: Record<Provenance, string> = {
  official: "Official record", news: "News report", community: "Resident reports", demo: "Demo data",
};

export type ClusterDetail = {
  cluster: Cluster;
  reports: { id: string; severity: number; note: string | null; department: string | null; promised_end: string | null; photo: string | null; created_at: string }[];
  confirmations: { fixed: number; still_there: number };
  nearby_works: { id: string; department: string | null; promised_end: string | null; distance_m: number }[];
};

export const KINDS: Record<Kind, { label: string; plural: string; color: string; severity: [string, string, string]; authority: string }> = {
  pothole: {
    label: "Pothole", plural: "Potholes", color: "var(--pothole)",
    severity: ["Small", "Wheel-sized", "Crater"],
    authority: "The Assistant Engineer (Roads), Greater Chennai Corporation",
  },
  waterlogging: {
    label: "Waterlogging", plural: "Waterlogging", color: "var(--water)",
    severity: ["Ankle-deep", "Knee-deep", "Waist-deep"],
    authority: "The Executive Engineer (Storm Water Drains), Greater Chennai Corporation",
  },
  worksite: {
    label: "Work site", plural: "Work sites", color: "var(--works)",
    severity: ["Footpath only", "Lane blocked", "Road blocked"],
    authority: "The Executive Engineer, Greater Chennai Corporation",
  },
  outage: {
    label: "Power cut", plural: "Power cuts", color: "var(--outage)",
    severity: ["Flickering", "Whole street", "Whole area"],
    authority: "The Assistant Engineer (O&M), TNPDCL section office",
  },
};

// A reported power cut counts as live for six hours after the latest report.
export function isLiveOutage(c: Cluster) {
  return c.kind === "outage" && c.status === "open" && Date.now() - new Date(c.last_reported_at).getTime() < 6 * 3_600_000;
}

// Seed photos live in /public; uploaded ones are absolute Blob URLs.
export function photoSrc(path: string | null) {
  if (!path) return null;
  return path.startsWith("https://") ? path : `/${path}`;
}

// Mirrors public.cluster_priority in the database, so the UI can explain the score.
export function priorityParts(c: Cluster) {
  const days = (Date.now() - new Date(c.first_reported_at).getTime()) / 86_400_000;
  return [
    { label: `Severity ${c.severity_max}/3`, points: 20 * c.severity_max },
    { label: `${c.reporter_count} distinct reporter${c.reporter_count === 1 ? "" : "s"}`, points: 8 * Math.min(c.reporter_count, 10) },
    { label: `Open ${Math.floor(days)} day${Math.floor(days) === 1 ? "" : "s"}`, points: Math.min(Math.floor(days * 3), 21) },
    ...(c.near_worksite ? [{ label: "Next to an active work site", points: 15 }] : []),
  ];
}

export function isOverdue(promisedEnd: string | null) {
  return !!promisedEnd && new Date(promisedEnd + "T23:59:59+05:30").getTime() < Date.now();
}

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86_400)} d ago`;
}

export function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

// Fixed template, filled from the ledger: nothing here is generated or guessed.
export function complaintDraft(d: ClusterDetail, pageUrl: string) {
  const c = d.cluster;
  const k = KINDS[c.kind];
  const sev = k.severity[c.severity_max - 1].toLowerCase();
  const works = d.nearby_works.filter((w) => w.department);
  const lines = [
    `To,`,
    k.authority,
    ...(works.length ? [`Copy to: ${[...new Set(works.map((w) => w.department))].join("; ")}`] : []),
    ``,
    `Subject: ${k.label} (${sev}) reported by ${c.reporter_count} residents, ref. TH-${shortId(c.id)}`,
    ``,
    `Sir/Madam,`,
    ``,
    `${c.reporter_count} residents have independently reported a ${k.label.toLowerCase()} (${sev}) at ` +
      `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)} (https://www.openstreetmap.org/?mlat=${c.lat.toFixed(5)}&mlon=${c.lng.toFixed(5)}#map=19/${c.lat.toFixed(5)}/${c.lng.toFixed(5)}). ` +
      `It was first reported on ${formatDate(c.first_reported_at)} and remains unresolved.`,
    ...works.map((w) =>
      `The site lies ${w.distance_m} m from an active work site of ${w.department}` +
      (w.promised_end ? `, with a promised completion date of ${formatDate(w.promised_end)}${isOverdue(w.promised_end) ? " (now overdue)" : ""}` : "") +
      `. Please confirm whether restoration of this stretch is within that agency's scope before engaging another contractor.`),
    ``,
    `Photos, report history and neighbour confirmations are public at: ${pageUrl}`,
    ``,
    `I request that the issue be inspected and repaired, and that the expected date of completion be shared.`,
    ``,
    `Yours faithfully,`,
    `[Your name]`,
    `[Ward / locality]`,
  ];
  return lines.join("\n");
}
