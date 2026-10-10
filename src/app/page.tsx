import Link from "next/link";
import Image from "next/image";
import { getClusters, getFindings, getNotices } from "@/lib/data";
import { KINDS, NOTICE_KINDS, PROVENANCE, REQUEST_CATEGORIES, clusterTitle, isLiveOutage, photoSrc, timeAgo, type Notice, type Provenance } from "@/lib/issues";
import { inForceOrSoon, span } from "@/lib/time";
import { streetHref } from "@/lib/links";
import { KindBadge } from "@/components/kind-icon";
import { MapPreview } from "@/components/map-preview";
import { StreetPicker } from "@/components/street-picker";
import { VouchButton } from "@/components/vouch-button";
import { HeroStreet } from "@/components/hero-street";

// Pre-rendered and served from the edge; regenerated on writes (revalidateTag) or every minute.
export const revalidate = 60;

// Streets from across India; Chennai has the deepest data so far (zones, notices, mapped works).
const EXAMPLES = [
  { name: "MG Road", area: "Bengaluru", lat: 12.9756, lng: 77.605 },
  { name: "Connaught Place", area: "New Delhi", lat: 28.6315, lng: 77.2167 },
  { name: "Linking Road", area: "Mumbai", lat: 19.064, lng: 72.834 },
  { name: "Velachery Main Road", area: "Chennai", lat: 12.9793, lng: 80.2189 },
  { name: "Park Street", area: "Kolkata", lat: 22.553, lng: 88.352 },
];

// What each source label means, in the order a reader can rely on them.
const SOURCES: [Provenance, string, string][] = [
  ["official", "Official record", "Published by the agency itself."],
  ["news", "News report", "Published by a news outlet, with a link to the article."],
  ["osm", "OpenStreetMap", "Mapped by volunteers. Shows that works exist, not their dates."],
  ["community", "Resident reports", "Submitted here by residents. Not checked by any agency."],
  ["demo", "Demo data", "Sample records that show how the site works. Not real."],
];

const place = (n: Notice) => n.area_text?.split(/[.(,]/)[0].trim() || n.title;

// Notices issued together (one suspension that covers many localities) are listed once, with the places named.
function grouped(notices: Notice[]) {
  const groups = new Map<string, Notice[]>();
  for (const n of notices) {
    const key = [n.kind, n.agency, n.starts_at, n.ends_at].join("|");
    groups.set(key, [...(groups.get(key) ?? []), n]);
  }
  return [...groups.values()];
}

export default async function Home() {
  const [clusters, findings, notices] = await Promise.all([getClusters(), getFindings(), getNotices()]);
  const upcoming = inForceOrSoon(notices);
  const groups = grouped(upcoming);
  const open = clusters.filter((c) => c.status === "open" && (c.kind !== "outage" || isLiveOutage(c)));
  const live = open.filter(isLiveOutage);
  const asks = open.filter((c) => c.kind === "request").sort((a, b) => b.reporter_count - a.reporter_count);
  const incidents = notices.filter((n) => n.kind === "incident").sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const demoOpen = open.filter((c) => c.demo).length;
  // three photographed reports, most urgent first, one per kind where possible
  const withPhoto = open.filter((c) => c.cover_photo).sort((a, b) => b.priority - a.priority);
  const firstOfKind = withPhoto.filter((c, i) => withPhoto.findIndex((d) => d.kind === c.kind) === i);
  const photos = [...firstOfKind, ...withPhoto.filter((c) => !firstOfKind.includes(c))].slice(0, 3);
  const shown = live.length ? 2 : 3;
  const pins = open.map((c) => ({ lat: c.lat, lng: c.lng, kind: c.kind, n: Math.min(c.reporter_count, 8) }));
  const works = notices.filter((n) => n.kind === "works").map((n) => ({ lat: n.lat, lng: n.lng, r: n.radius_m }));

  return (
    <main>
      {/* The street: look one up. Beside it, a street plan where works keep happening, and what is in force right now. */}
      <section className="asphalt relative isolate overflow-hidden">
        <HeroStreet />

        <div className="relative z-[4] mx-auto grid max-w-6xl grid-cols-1 px-4 sm:px-6 lg:min-h-[39rem] lg:grid-cols-[53%_47%]">
          <div className="pb-12 pt-6 lg:py-20 lg:pr-12">
            <h1 className="display text-[clamp(2.6rem,6.4vw,4.9rem)]">Every street has a <span className="accent-word">record.</span></h1>
            <p className="mt-6 max-w-md text-lg text-fg-2">
              Road works, power and water cuts, reported damage, and the office that answers for them. Search any street.
            </p>
            <div className="mt-8 max-w-xl"><StreetPicker examples={EXAMPLES} /></div>
            <dl className="mt-12 grid max-w-xl grid-cols-3 gap-x-6 border-t border-line pt-6">
              {([[notices.length - works.length, "published notices and incidents"], [works.length, "stretches of mapped works"], [open.length, demoOpen ? `open reports, ${demoOpen} of them demo` : "open reports"]] as const).map(([n, label]) => (
                <div key={label} className="flex min-w-0 flex-col-reverse">
                  <dt className="note mt-1 max-w-[11rem] text-fg-2">{label}</dt>
                  <dd className="figure-num text-2xl sm:text-3xl">{n}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* notice board, laid over the foot of the street plan */}
          <div className="relative flex items-end pb-10 lg:justify-end lg:pb-14 lg:pl-10">
            <div className="w-full rounded-[6px] border border-line bg-[color-mix(in_oklab,var(--bg)_94%,transparent)] p-5 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.7)] lg:max-w-[27rem]">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="display-face text-[1.0625rem] font-bold [font-stretch:108%]">In force, next 48 hours</h2>
                <Link href="/records" className="link shrink-0 text-sm text-fg-2">All records</Link>
              </div>
              <ul className="mt-3">
                {live.length > 0 && (
                  <li className="border-t border-line">
                    <Link href="/map" className="group flex items-start gap-3 py-3">
                      <KindBadge kind="outage" size={24} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold group-hover:underline">Power reported off in {live.length} {live.length === 1 ? "area" : "areas"}</span>
                        <span className="block text-sm text-fg-2">By {live.reduce((n, c) => n + c.reporter_count, 0)} residents in the last 6 hours</span>
                      </span>
                      <span className={`tag ${live.every((c) => c.demo) ? "tag-demo" : "tag-community"}`}>{live.every((c) => c.demo) ? "Demo data" : "Resident reports"}</span>
                    </Link>
                  </li>
                )}
                {groups.slice(0, shown).map(([n, ...more]) => (
                  <li key={n.id} className="grid grid-cols-[auto_1fr] gap-x-3 border-t border-line py-3">
                    <span className="mt-[0.45rem] h-2.5 w-2.5 rounded-[2px]" style={{ background: NOTICE_KINDS[n.kind].color }} aria-hidden />
                    <span className="min-w-0">
                      {more.length === 0
                        ? <Link href={streetHref({ lat: n.lat, lng: n.lng, name: place(n) })} className="block font-semibold hover:underline">{NOTICE_KINDS[n.kind].label}, {place(n)}</Link>
                        : <Link href="/records" className="block font-semibold hover:underline">{NOTICE_KINDS[n.kind].label} in {more.length + 1} localities</Link>}
                      {more.length > 0 && <span className="block text-sm text-fg-2">{[n, ...more].slice(0, 3).map(place).join(", ")}{more.length > 2 && ` and ${more.length - 2} more`}</span>}
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-2">
                        <span className="tabular-nums">{span(new Date(n.starts_at), n.ends_at ? new Date(n.ends_at) : null)}</span>
                        {n.source_url
                          ? <a href={n.source_url} target="_blank" rel="noreferrer" className="link">{PROVENANCE[n.provenance]}: {n.source_name.split(" (")[0]}</a>
                          : <span>{PROVENANCE[n.provenance]}</span>}
                      </span>
                    </span>
                  </li>
                ))}
                {live.length === 0 && upcoming.length === 0 && <li className="border-t border-line py-4 text-fg-2">No shutdowns or suspensions on record for the next 48 hours.</li>}
              </ul>
              {groups.length > shown && <p className="border-t border-line pt-3 text-sm text-fg-2">{upcoming.length} notices in force or starting soon.</p>}
            </div>
          </div>
        </div>
        <div className="lane relative z-[4]" aria-hidden />
      </section>

      {/* The record: findings, with the limits of each stated */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-x-14 gap-y-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.55fr_1fr] lg:py-20">
        <div className="min-w-0">
          <div className="flex items-end justify-between gap-4">
            <h2 className="section-title">Records to check</h2>
            {findings.length > 0 && <Link href="/records" className="link shrink-0 text-sm">All {findings.length} findings</Link>}
          </div>
          <p className="mt-2 max-w-xl text-fg-2">Places where the records raise a question. Each one is something to verify, not a conclusion.</p>
          <ol className="mt-6 border-t-2 border-fg">
            {findings.slice(0, 4).map((f, i) => (
              <li key={f.id} className="grid grid-cols-[2.25rem_1fr] border-b border-line py-5">
                <span className="figure-num pt-0.5 text-lg text-fg-3" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <Link href={streetHref({ lat: f.lat, lng: f.lng, name: f.title })} className="display-face text-[1.1875rem] font-bold leading-snug hover:underline">{f.title}</Link>
                  <p className="mt-1.5 line-clamp-2 max-w-2xl text-fg-2">{f.explanation}</p>
                  <p className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="tag tag-verify">{f.label}</span>
                    {f.demo && <span className="tag tag-demo">Demo data</span>}
                  </p>
                </div>
              </li>
            ))}
            {findings.length === 0 && <li className="border-b border-line py-5 text-fg-2">Nothing flagged in the records right now. That means no rule was triggered, not that everything is fine.</li>}
          </ol>
        </div>

        <aside aria-labelledby="sources-h" className="min-w-0 self-start rounded-[6px] border border-line bg-surface p-6 lg:mt-2">
          <h2 id="sources-h" className="display-face text-[1.0625rem] font-bold [font-stretch:108%]">Where each record comes from</h2>
          <dl className="mt-4 space-y-3.5">
            {SOURCES.map(([k, name, meaning]) => (
              <div key={k} className="grid grid-cols-[8.75rem_1fr] items-baseline gap-x-3">
                <dt><span className={`tag tag-${k}`}>{name}</span></dt>
                <dd className="text-sm text-fg-2">{meaning}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 border-t border-line pt-4 text-sm font-medium">A missing record is not proof that work was not done. <Link href="/about" className="link font-normal text-fg-2">How the rules work</Link></p>
        </aside>
      </section>

      {/* The evidence: what residents photographed and asked for, and where */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <div>
              <h2 className="section-title">Reported by residents</h2>
              <p className="mt-2 max-w-2xl text-fg-2">
                {open.length} open {open.length === 1 ? "report" : "reports"} and requests.
                {demoOpen > 0 && <> {demoOpen === open.length ? "All" : demoOpen} of them {demoOpen === 1 ? "is" : "are"} <span className="tag tag-demo align-middle">Demo data</span> while real reports come in.</>}
              </p>
            </div>
            <Link href="/map?report=1" className="btn btn-primary">Report a problem</Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
            {photos.map((c, i) => (
              <Link key={c.id} href={`/c/${c.id}`}
                className={`group relative block min-w-0 overflow-hidden rounded-[6px] bg-surface-2 ${i === 0 ? "aspect-[4/3] lg:col-span-7 lg:row-span-2 lg:aspect-auto lg:min-h-[28rem]" : "aspect-[16/9] lg:col-span-5 lg:aspect-auto lg:min-h-[13.5rem]"}`}>
                <Image src={photoSrc(c.cover_photo)!} alt={`${KINDS[c.kind].label} photographed by a resident`} fill sizes={i === 0 ? "(min-width:1024px) 660px, 100vw" : "(min-width:1024px) 470px, 100vw"} className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]" />
                <span className="absolute inset-x-0 bottom-0 bg-[linear-gradient(0deg,rgb(12_15_16/0.9),rgb(12_15_16/0.55)_60%,transparent)] px-4 pb-4 pt-14 text-white">
                  <span className="flex items-center gap-2.5">
                    <KindBadge kind={c.kind} size={26} />
                    <span className={`display-face font-bold leading-tight group-hover:underline ${i === 0 ? "text-xl" : "text-[1.0625rem]"}`}>{clusterTitle(c)}</span>
                  </span>
                  <span className="note mt-1.5 block text-white/85">
                    {c.reporter_count} {c.reporter_count === 1 ? "report" : "reports"}, last {timeAgo(c.last_reported_at)}{c.demo && ". Demo data, illustrative photo"}
                  </span>
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-12 grid grid-cols-1 gap-x-14 gap-y-10 lg:grid-cols-[1.25fr_1fr]">
            <MapPreview pins={pins} works={works} />
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="display-face text-[1.1875rem] font-bold [font-stretch:108%]">Most backed requests</h3>
                <Link href="/requests" className="link shrink-0 text-sm">All requests</Link>
              </div>
              <ol className="mt-3 border-t-2 border-fg">
                {asks.slice(0, 4).map((r) => (
                  <li key={r.id} className="flex items-center gap-3 border-b border-line py-3.5">
                    <span className="figure-num w-9 shrink-0 text-2xl" aria-hidden>{r.reporter_count}</span>
                    <Link href={`/c/${r.id}`} className="min-w-0 flex-1">
                      <span className="block truncate font-semibold hover:underline">{REQUEST_CATEGORIES[r.category ?? "other"].label}</span>
                      <span className="block text-sm text-fg-2">
                        {r.reporter_count} {r.reporter_count === 1 ? "resident" : "residents"} asking, {timeAgo(r.last_reported_at)}{r.demo && ", demo"}
                      </span>
                    </Link>
                    <VouchButton id={r.id} initial={r.vouches} compact label="Vouch" />
                  </li>
                ))}
                {asks.length === 0 && <li className="border-b border-line py-4 text-fg-2">No open requests yet. <Link href="/map?report=request" className="link">Raise the first one</Link></li>}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* What published reports say has gone wrong, each linked to its source */}
      {incidents.length > 0 && (
        <section className="asphalt">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="grid grid-cols-1 gap-x-14 gap-y-3 lg:grid-cols-[1fr_1.55fr] lg:items-end">
              <h2 className="section-title">Incidents on record</h2>
              <p className="max-w-xl text-fg-2">Damage and unfinished restoration, as reported by news outlets. Follow each source for the full account.</p>
            </div>
            <ul className="mt-8 border-t border-line">
              {incidents.slice(0, 3).map((n) => {
                const d = new Date(n.starts_at);
                return (
                  <li key={n.id} className="grid grid-cols-1 gap-x-10 gap-y-2 border-b border-line py-6 lg:grid-cols-[9rem_1fr_15rem]">
                    <p className="flex items-baseline gap-2 lg:flex-col lg:gap-0">
                      <span className="figure-num text-[2rem]">{d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}</span>
                      <span className="note text-fg-3">{d.toLocaleDateString("en-IN", { year: "numeric", timeZone: "Asia/Kolkata" })}</span>
                    </p>
                    <div className="min-w-0">
                      <Link href={streetHref({ lat: n.lat, lng: n.lng, name: place(n) })} className="display-face text-[1.25rem] font-bold leading-snug hover:underline">{n.title}</Link>
                      <p className="mt-1.5 text-fg-2">{n.area_text}</p>
                    </div>
                    <div className="text-sm text-fg-2">
                      <p>Agencies named: {n.agency}</p>
                      {n.source_url && <a href={n.source_url} target="_blank" rel="noreferrer" className={`tag tag-${n.provenance} mt-2.5 hover:underline`}>{n.source_name}</a>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Next actions */}
      <section>
        <div className="mx-auto grid max-w-6xl grid-cols-1 px-4 py-4 sm:px-6 md:grid-cols-3 md:py-0">
          {[
            { href: "/street", t: "Look up a street", d: "Works, cuts and reports within 500 m, and the office that answers for them." },
            { href: "/map?report=1", t: "Report a problem", d: "A pothole, flooding, a power cut or blocked parking. No account needed." },
            { href: "/requests", t: "Back a request", d: "Vouch for a streetlight, drain or garbage request instead of filing it again." },
          ].map((a) => (
            <Link key={a.href} href={a.href} className="group border-line py-7 max-md:border-b max-md:last:border-0 md:border-l md:px-8 md:py-12 md:first:border-l-0 md:first:pl-0">
              <span className="display-face flex items-center justify-between gap-3 text-[1.25rem] font-bold [font-stretch:108%]">
                {a.t}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
              <span className="mt-2 block max-w-xs text-sm text-fg-2">{a.d}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
