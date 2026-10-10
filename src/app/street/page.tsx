import type { Metadata } from "next";
import Link from "next/link";
import { getStreet } from "@/lib/data";
import { rainForecast } from "@/lib/forecast";
import { buildOutlook } from "@/lib/outlook";
import { departments, locate } from "@/lib/jurisdiction";
import { KINDS, NOTICE_KINDS, PROVENANCE, isLiveOutage, timeAgo, type Kind } from "@/lib/issues";
import { SITE } from "@/lib/site";
import { dayMonth, hhmm } from "@/lib/time";
import { KindBadge } from "@/components/kind-icon";
import { Sheet } from "@/components/sheet";
import { BlurFade } from "@/components/motion-bits";
import { OutlookGrid } from "@/components/outlook-grid";
import { FindingCard } from "@/components/finding-card";
import { WhoAnswers } from "@/components/who-answers";
import { StreetPicker } from "@/components/street-picker";
import { BackLink } from "@/components/back-link";

export const metadata: Metadata = { title: "Your street" };

const EXAMPLES = [
  { name: "Velachery Main Road", area: "Velachery, Chennai", lat: 12.9793, lng: 80.2189 },
  { name: "Arcot Road", area: "Vadapalani, Chennai", lat: 13.0505, lng: 80.2121 },
  { name: "2nd Avenue", area: "Anna Nagar, Chennai", lat: 13.0872, lng: 80.2103 },
  { name: "KK Nagar", area: "Chennai", lat: 13.0392, lng: 80.1992 },
  { name: "IIITDM Kancheepuram", area: "Vandalur-Kelambakkam Road", lat: 12.8373, lng: 80.137 },
];

function Lamps({ off }: { off: boolean }) {
  return (
    <div className="flex items-end gap-5" aria-hidden>
      {Array.from({ length: 7 }, (_, i) => (
        <svg key={i} width="22" height="40" viewBox="0 0 22 40" className={off ? "lights-out" : ""} style={{ animationDelay: `${i * 0.18}s` }}>
          <path d="M11 40V10M11 10h7" stroke="var(--fg-3)" strokeWidth="1.6" fill="none" />
          <circle cx="18" cy="12" r="3.2" fill="var(--works)" />
          <circle cx="18" cy="12" r="8" fill="var(--works)" opacity="0.18" />
        </svg>
      ))}
    </div>
  );
}

export default async function StreetPage({ searchParams }: PageProps<"/street">) {
  const sp = await searchParams;
  const lat = Number(sp.lat), lng = Number(sp.lng);
  const name = typeof sp.name === "string" && sp.name.trim() ? sp.name.trim().slice(0, 80) : "This street";
  const area = typeof sp.area === "string" ? sp.area.slice(0, 120) : "";
  const valid = Number.isFinite(lat) && Number.isFinite(lng) && lat >= 6 && lat <= 37.5 && lng >= 68 && lng <= 97.5;

  if (!valid) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 pt-20 sm:px-6">
        <p className="label text-fg-3">Street record</p>
        <h1 className="display mt-4 max-w-3xl text-[clamp(2.4rem,6vw,4.6rem)]">Look up <span className="accent-word">your</span> street.</h1>
        <p className="mt-5 max-w-2xl text-lg text-fg-2">
          Everything recorded within 500 m: works and their permissions, power and water cuts, damage, what is planned for the next two days,
          what the records leave out, and who answers for it.
        </p>
        <div className="mt-10"><StreetPicker examples={EXAMPLES} /></div>
      </main>
    );
  }

  // Round to ~10 m so nearby lookups share a cache entry.
  const [street, rain] = await Promise.all([getStreet(Math.round(lat * 1e4) / 1e4, Math.round(lng * 1e4) / 1e4), rainForecast(lat, lng)]);
  const j = locate(lat, lng);
  const outlook = buildOutlook(street.clusters, street.notices, rain, street.waterlogging_history);
  const live = street.clusters.filter(isLiveOutage);
  const open = street.clusters.filter((c) => c.status === "open" && (c.kind !== "outage" || isLiveOutage(c)));
  const kinds = [...new Set(open.map((c) => c.kind))] as Kind[];
  const contacts = (kinds.length ? kinds : (["notice"] as const)).flatMap((k) => departments(k));
  const pageUrl = `${SITE.url}/street?lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}&name=${encodeURIComponent(name)}`;
  const message = [
    `Street record for ${name}${area ? `, ${area}` : ""}:`,
    open.length ? open.map((c) => `${KINDS[c.kind].label} (${c.reporter_count} ${c.reporter_count === 1 ? "report" : "reports"})`).join("; ") : "No open issues reported.",
    street.findings.length ? `${street.findings.length} item${street.findings.length === 1 ? "" : "s"} in the public records need checking.` : "",
    `Full record: ${pageUrl}`,
  ].filter(Boolean).join("\n");

  const timeline = [
    ...street.notices.map((n) => ({ at: n.starts_at, kind: "notice" as const, n })),
    ...street.clusters.map((c) => ({ at: c.first_reported_at, kind: "cluster" as const, c })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <BackLink href="/street">Look up another street</BackLink>

      <header className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <BlurFade>
          <p className="label text-fg-3">Street record, 500 m radius</p>
          <h1 className="display mt-3 text-[clamp(2.4rem,6vw,4.8rem)]">{name}</h1>
          <p className="mt-3 text-fg-2">
            {area && <>{area}. </>}
            {j.zone ? <>Zone {j.zone.no}, {j.zone.name}. </> : <>Outside GCC limits. </>}
            <span className="font-mono text-sm text-fg-3">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
          </p>
        </BlurFade>
        <div className="flex flex-wrap gap-2">
          <Link href="/map" className="rounded-[8px] border border-line px-4 py-2 text-sm hover:border-fg-3">Open the map</Link>
          <Link href="/map?report=1" className="rounded-[8px] bg-fg px-4 py-2 text-sm font-medium text-bg hover:opacity-85">Report something here</Link>
        </div>
      </header>

      {live.length > 0 && (
        <BlurFade delay={0.1}>
          <section className="mt-8 flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-[6px] border border-outage/40 bg-[color-mix(in_oklab,var(--outage)_10%,var(--bg))] px-6 py-5">
            <div>
              <p className="label text-outage">Lights out</p>
              <p className="mt-1 text-xl font-semibold tracking-[-0.02em]">
                Power reported off since {hhmm(new Date(live[0].first_reported_at))}, by {live.reduce((n, c) => n + c.reporter_count, 0)} residents.
              </p>
              {live.some((c) => c.demo) && <span className="tag tag-demo mt-2">Demo data</span>}
            </div>
            <Lamps off />
          </section>
        </BlurFade>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <div className="min-w-0 space-y-8">
          <BlurFade inView>
            <Sheet label="Next 48 hours" no="01" bodyClassName="p-5">
              <OutlookGrid outlook={outlook} />
            </Sheet>
          </BlurFade>

          <BlurFade inView>
            <Sheet label="What the records show" no="02" bodyClassName="space-y-6 p-5">
              {street.findings.length === 0
                ? <p className="text-fg-2">No gaps found in the records checked within 500 m. This means nothing was flagged, not that everything is fine.</p>
                : street.findings.map((f) => <FindingCard key={f.id} f={f} place={name} />)}
            </Sheet>
          </BlurFade>

          <BlurFade inView>
            <Sheet label="The record" no="03" bodyClassName="p-5">
              <ol className="relative space-y-4 border-l border-line pl-5">
                {timeline.length === 0 && <li className="text-fg-3">Nothing recorded here yet.</li>}
                {timeline.map((t) => t.kind === "notice" ? (
                  <li key={`n${t.n.id}`} className="relative">
                    <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-[3px] border-2 border-bg" style={{ background: NOTICE_KINDS[t.n.kind].color }} />
                    <p className="font-mono text-[11px] text-fg-3">
                      {t.n.kind === "works" ? `Mapped as ongoing, checked ${dayMonth(new Date(t.n.imported_at))}` : <>{dayMonth(new Date(t.n.starts_at))}{t.n.ends_at && ` to ${dayMonth(new Date(t.n.ends_at))}`}</>}
                    </p>
                    <p className="font-medium">{NOTICE_KINDS[t.n.kind].label}: {t.n.title}</p>
                    <p className="text-sm text-fg-2">{t.n.agency}{t.n.reference && <span className="font-mono text-fg-3">, ref {t.n.reference}</span>}</p>
                    <p className="mt-1 flex flex-wrap gap-1.5">
                      <span className={`tag tag-${t.n.provenance}`}>{PROVENANCE[t.n.provenance]}</span>
                      {t.n.source_url && <a href={t.n.source_url} target="_blank" rel="noreferrer" className="tag tag-community hover:text-fg">Source: {t.n.source_name}</a>}
                    </p>
                  </li>
                ) : (
                  <li key={`c${t.c.id}`} className="relative">
                    <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-[3px] border-2 border-bg" style={{ background: KINDS[t.c.kind].color }} />
                    <p className="font-mono text-[11px] text-fg-3">{dayMonth(new Date(t.c.first_reported_at))}</p>
                    <Link href={`/c/${t.c.id}`} className="font-medium underline decoration-line underline-offset-4 hover:decoration-fg">
                      {KINDS[t.c.kind].severity[t.c.severity_max - 1]} {KINDS[t.c.kind].label.toLowerCase()}, {t.c.reporter_count} {t.c.reporter_count === 1 ? "report" : "reports"}
                    </Link>
                    <p className="mt-1 flex flex-wrap gap-1.5">
                      <span className={`tag ${t.c.demo ? "tag-demo" : "tag-community"}`}>{t.c.demo ? "Demo data" : "Resident reports"}</span>
                      <span className="tag tag-gap">{t.c.status === "resolved" ? "Confirmed fixed" : "Open"}</span>
                    </p>
                  </li>
                ))}
              </ol>
            </Sheet>
          </BlurFade>
        </div>

        <aside className="min-w-0 space-y-8">
          <BlurFade inView>
            <Sheet label="Right now" no="04" bodyClassName="p-3">
              <ul>
                {open.length === 0 && <li className="p-3 text-fg-3">Nothing open within 500 m.</li>}
                {open.map((c) => (
                  <li key={c.id}>
                    <Link href={`/c/${c.id}`} className="flex items-center gap-3 rounded-[6px] p-2.5 transition hover:bg-surface-2">
                      <KindBadge kind={c.kind} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{KINDS[c.kind].severity[c.severity_max - 1]} {KINDS[c.kind].label.toLowerCase()}</span>
                        <span className="block truncate text-sm text-fg-3">{c.kind === "worksite" ? c.department : `${c.reporter_count} reports, ${timeAgo(c.last_reported_at)}`}</span>
                      </span>
                      {c.demo && <span className="tag tag-demo">Demo</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </Sheet>
          </BlurFade>

          <BlurFade inView>
            <Sheet label="Who answers here" no="05" bodyClassName="p-5">
              <WhoAnswers j={j} contacts={contacts} message={message} subject={`Street record: ${name}`} />
            </Sheet>
          </BlurFade>
        </aside>
      </div>
    </main>
  );
}
