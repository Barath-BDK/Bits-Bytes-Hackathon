// Home page panels: today's records with live figures, what can be reported, and what the city is asking for.
import Link from "next/link";
import { KINDS, NOTICE_KINDS, PROVENANCE, REQUEST_CATEGORIES, isLiveOutage, timeAgo, type Cluster, type Finding, type Kind, type Notice } from "@/lib/issues";
import { streetHref } from "@/lib/links";
import { dayWord, hhmm } from "@/lib/time";
import { KindBadge, KindIcon } from "@/components/kind-icon";
import { NumberTicker } from "@/components/motion-bits";
import { VouchButton } from "@/components/vouch-button";

// Each kind of finding gets a colour and a glyph, so a list of them reads at a glance.
export const FINDING_STYLE: Record<string, { tone: string; icon: Kind }> = {
  possible_cable_strike: { tone: "var(--outage)", icon: "outage" },
  damage_near_works: { tone: "var(--pothole)", icon: "pothole" },
  promised_date_passed: { tone: "var(--works)", icon: "worksite" },
  completion_not_found: { tone: "var(--alert)", icon: "worksite" },
  possible_record_match: { tone: "var(--water)", icon: "worksite" },
  dug_after_resurfacing: { tone: "var(--works)", icon: "worksite" },
  joint_works_possible: { tone: "var(--ok)", icon: "worksite" },
};

const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden
    className="shrink-0 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

export function TodayPanel({ findings, upcoming, clusters }: { findings: Finding[]; upcoming: Notice[]; clusters: Cluster[] }) {
  const open = clusters.filter((c) => c.status === "open" && (c.kind !== "outage" || isLiveOutage(c)));
  const live = open.filter(isLiveOutage);
  const requests = open.filter((c) => c.kind === "request");
  const kinds = (["pothole", "waterlogging", "request", "parking", "worksite"] as Kind[]).map((k) => [k, open.filter((c) => c.kind === k).length] as const);
  const issues = kinds.reduce((n, [, v]) => n + v, 0);
  const types = [...new Set(findings.map((f) => f.type))];

  return (
    <div className="sheet overflow-hidden">
      <div className="grid md:grid-cols-[1.35fr_1fr]">
        <div className="border-b border-line md:border-b-0 md:border-r">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <span className="label flex items-center gap-2 text-fg-3">
              <span className="live-ring h-2 w-2 rounded-full bg-ok text-ok" aria-hidden />
              {findings.length ? "The records today" : "In force and coming up"}
            </span>
            <Link href="/records" className="label text-fg-3 transition hover:text-fg">{findings.length ? "All findings" : "All records"}</Link>
          </div>
          <ol>
            {findings.length > 0 ? findings.slice(0, 4).map((f) => {
              const st = FINDING_STYLE[f.type] ?? { tone: "var(--accent)", icon: "worksite" as Kind };
              return (
                <li key={f.id} className="border-b border-line last:border-0">
                  <Link href={streetHref({ lat: f.lat, lng: f.lng, name: f.title })} style={{ "--tone": st.tone } as React.CSSProperties}
                    className="row-hover group flex items-center gap-4 px-5 py-4 transition hover:bg-surface-2/50">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] transition group-hover:scale-105"
                      style={{ background: `color-mix(in oklab, ${st.tone} 18%, transparent)`, color: st.tone, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${st.tone} 35%, transparent)` }}>
                      <KindIcon kind={st.icon} size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="label block truncate" style={{ color: st.tone }}>{f.label}</span>
                      <span className="mt-0.5 block truncate font-medium tracking-[-0.01em]">{f.title}</span>
                      <span className="line-clamp-1 text-sm text-fg-3">{f.explanation}</span>
                    </span>
                    {f.demo && <span className="tag tag-demo shrink-0">Demo</span>}
                    <Arrow />
                  </Link>
                </li>
              );
            }) : upcoming.slice(0, 4).map((n) => (
              <li key={n.id} className="border-b border-line last:border-0">
                <Link href={streetHref({ lat: n.lat, lng: n.lng, name: n.area_text?.split(/[.(,]/)[0] ?? n.title })} style={{ "--tone": NOTICE_KINDS[n.kind].color } as React.CSSProperties}
                  className="row-hover group flex items-center gap-4 px-5 py-4 transition hover:bg-surface-2/50">
                  <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: NOTICE_KINDS[n.kind].color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium tracking-[-0.01em]">{n.title}</span>
                    <span className="line-clamp-1 text-sm text-fg-3">{dayWord(new Date(n.starts_at))} {hhmm(new Date(n.starts_at))}, {n.area_text}</span>
                  </span>
                  <span className={`tag tag-${n.provenance} shrink-0`}>{PROVENANCE[n.provenance]}</span>
                  <Arrow />
                </Link>
              </li>
            ))}
            {findings.length === 0 && upcoming.length === 0 && <li className="px-5 py-6 text-fg-3">Nothing flagged and no notices in force today.</li>}
          </ol>
        </div>

        <div className="grid grid-cols-2">
          <Figure label="Open issues" n={issues} className="border-b border-r border-line">
            {/* share of each kind, as one stacked bar */}
            <span className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              {kinds.filter(([, v]) => v > 0).map(([k, v]) => <span key={k} title={`${KINDS[k].plural}: ${v}`} style={{ width: `${(v / Math.max(1, issues)) * 100}%`, background: KINDS[k].color }} />)}
            </span>
            <span className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1 text-[11px] text-fg-3">
              {kinds.filter(([, v]) => v > 0).map(([k, v]) => <span key={k} className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-[2px]" style={{ background: KINDS[k].color }} />{v} {KINDS[k].plural.toLowerCase()}</span>)}
            </span>
          </Figure>
          <Figure label="Live power cuts" n={live.length} tone="var(--outage)" className="border-b border-line" live={live.length > 0}>
            <span className="mt-3 block text-[12px] text-fg-3">{live.length ? `Latest ${timeAgo(live[0].last_reported_at)}` : "None reported in the last 6 hours"}</span>
          </Figure>
          <Figure label="Records to check" n={findings.length} tone="var(--works)" className="border-r border-line">
            <span className="mt-3 flex gap-1">
              {types.map((t) => <span key={t} className="h-1.5 flex-1 rounded-full" title={t} style={{ background: (FINDING_STYLE[t] ?? { tone: "var(--accent)" }).tone }} />)}
            </span>
          </Figure>
          <Figure label="Residents backing requests" n={requests.reduce((n, c) => n + c.reporter_count, 0)} tone="var(--request)">
            <Link href="/requests" className="mt-3 inline-flex text-[12px] text-request underline-offset-4 hover:underline">{requests.length} open {requests.length === 1 ? "request" : "requests"}</Link>
          </Figure>
        </div>
      </div>
    </div>
  );
}

function Figure({ n, label, tone, live, className = "", children }: { n: number; label: string; tone?: string; live?: boolean; className?: string; children?: React.ReactNode }) {
  return (
    <div className={`group relative flex flex-col justify-center overflow-hidden px-5 py-6 transition hover:bg-surface-2/40 ${className}`}>
      {tone && <span aria-hidden className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-25 blur-2xl transition-opacity group-hover:opacity-45" style={{ background: tone }} />}
      <span className="label flex items-center gap-2 text-fg-3">
        {tone && <span className={`h-2 w-2 rounded-[2px] ${live ? "live-ring" : ""}`} style={{ background: tone, color: tone }} />}
        {label}
      </span>
      <NumberTicker value={n} className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl" />
      {children}
    </div>
  );
}

// Every kind of report, as a row of coloured tiles that each open the form already set to that kind.
const KIND_NOTES: Record<Kind, string> = {
  pothole: "Merges within 25 m", waterlogging: "Feeds the rain risk", request: "Neighbours vouch for it", parking: "Spots, not number plates",
  worksite: "Signboard and promised date", outage: "Checked against digging nearby",
};
export function KindStrip() {
  const order: Kind[] = ["pothole", "waterlogging", "request", "parking", "worksite", "outage"];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {order.map((k) => (
        <Link key={k} href={`/map?report=${k}`} style={{ "--k": KINDS[k].color } as React.CSSProperties}
          className="kind-tile lift group relative overflow-hidden rounded-[10px] border border-line bg-surface/70 p-4">
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100" style={{ background: KINDS[k].color }} />
          <span aria-hidden className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40" style={{ background: KINDS[k].color }} />
          <span className="kind-glyph block w-fit"><KindBadge kind={k} size={40} /></span>
          <span className="mt-4 block font-semibold tracking-[-0.02em]">{KINDS[k].label}</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-fg-3">{KIND_NOTES[k]}</span>
        </Link>
      ))}
    </div>
  );
}

// What the city is asking for: the most backed open requests, each with its vouch button.
export function RequestFeed({ requests }: { requests: Cluster[] }) {
  const top = [...requests].filter((r) => r.status === "open").sort((a, b) => b.reporter_count - a.reporter_count).slice(0, 4);
  const max = Math.max(1, ...top.map((r) => r.reporter_count));
  if (!top.length) return <p className="text-fg-3">No open requests yet. Raise the first one from the map.</p>;
  return (
    <ul className="space-y-2.5">
      {top.map((r, i) => (
        <li key={r.id} className="feed-in lift relative overflow-hidden rounded-[10px] border border-line bg-surface/75 p-4" style={{ animationDelay: `${i * 0.12}s` }}>
          <span aria-hidden className="absolute inset-y-0 left-0 bg-request/10" style={{ width: `${(r.reporter_count / max) * 100}%` }} />
          <div className="relative flex items-center gap-3">
            <KindBadge kind="request" size={34} />
            <Link href={`/c/${r.id}`} className="min-w-0 flex-1">
              <span className="block truncate font-medium tracking-[-0.01em] hover:underline">{REQUEST_CATEGORIES[r.category ?? "other"].label}</span>
              <span className="block text-sm text-fg-3">{r.reporter_count} {r.reporter_count === 1 ? "resident" : "residents"} asking, {timeAgo(r.last_reported_at)}</span>
            </Link>
            {r.demo && <span className="tag tag-demo hidden shrink-0 sm:inline-flex">Demo</span>}
            <VouchButton id={r.id} initial={r.vouches} compact label="Vouch" />
          </div>
        </li>
      ))}
    </ul>
  );
}
