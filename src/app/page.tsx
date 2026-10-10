import Link from "next/link";
import Image from "next/image";
import { getClusters, getFindings, getNotices } from "@/lib/data";
import { KINDS, NOTICE_KINDS, PROVENANCE, REQUEST_CATEGORIES, clusterTitle, isLiveOutage, photoSrc, timeAgo } from "@/lib/issues";
import { dayWord, hhmm, inForceOrSoon } from "@/lib/time";
import { streetHref } from "@/lib/links";
import { SITE } from "@/lib/site";
import { KindBadge } from "@/components/kind-icon";
import { BlurFade, NumberTicker } from "@/components/motion-bits";
import { Hero } from "@/components/hero";
import { Sheet } from "@/components/sheet";
import { Tabs } from "@/components/tabs";
import { MapPreview } from "@/components/map-preview";
import { VouchButton } from "@/components/vouch-button";
import type { NewsItem } from "@/components/news-rotator";
import { GapVignette, LadderVignette, MergeBeams, OutlookVignette, PriorityLedger, StrikeVignette } from "@/components/vignettes";
import { HeroBackdrop } from "@/components/backdrops/hero-backdrop";

const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="transition-transform group-hover:translate-x-0.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

// Pre-rendered and served from the edge; regenerated on writes (revalidateTag) or every minute.
export const revalidate = 60;

export default async function Home() {
  const [clusters, findings, notices] = await Promise.all([getClusters(), getFindings(), getNotices()]);
  const upcoming = inForceOrSoon(notices);
  const open = clusters.filter((c) => c.status === "open" && (c.kind !== "outage" || isLiveOutage(c)));
  const live = open.filter(isLiveOutage);
  const withPhotos = open.filter((c) => c.cover_photo);
  const strike = findings.find((f) => f.type === "possible_cable_strike");
  const asks = open.filter((c) => c.kind === "request").sort((a, b) => b.reporter_count - a.reporter_count);
  const ticker: NewsItem[] = [
    ...(live.length ? [{ text: `Power reported off in ${live.length} ${live.length === 1 ? "area" : "areas"} right now`, href: "/map" }] : []),
    // at most two of each kind of finding, each naming the agency involved
    ...findings.filter((f, i) => findings.slice(0, i).filter((g) => g.type === f.type).length < 2).slice(0, 4)
      .map((f) => ({ text: `${f.label}: ${f.title.toLowerCase()}${typeof f.refs.agency === "string" ? `, ${f.refs.agency}` : ""}`, href: streetHref({ lat: f.lat, lng: f.lng, name: f.title }) })),
    ...upcoming.slice(0, 3).map((n) => ({ text: `${NOTICE_KINDS[n.kind].label}, ${n.area_text?.split(/[.(]/)[0] ?? n.title}: ${dayWord(new Date(n.starts_at))} ${hhmm(new Date(n.starts_at))}`, href: streetHref({ lat: n.lat, lng: n.lng, name: n.area_text?.split(/[.(,]/)[0] ?? n.title }) })),
    ...asks.slice(0, 2).map((c) => ({ text: `${c.reporter_count} residents ask: ${clusterTitle(c).toLowerCase()}`, href: `/c/${c.id}` })),
  ];
  const pins = open.map((c) => ({ lat: c.lat, lng: c.lng, kind: c.kind, n: Math.min(c.reporter_count, 8) }));
  const works = notices.filter((n) => n.kind === "works").map((n) => ({ lat: n.lat, lng: n.lng, r: n.radius_m }));

  const today = (
    <div className="sheet">
      <div className="grid overflow-hidden md:grid-cols-[1.4fr_1fr]">
        <div className="border-b border-line md:border-b-0 md:border-r">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <span className="label text-fg-3">{findings.length ? "What the records show" : "In force and coming up"}</span>
            <Link href="/records" className="label text-fg-3 hover:text-fg">{findings.length ? `All ${findings.length} findings` : "All records"}</Link>
          </div>
          <ol>
            {findings.length > 0 ? findings.slice(0, 4).map((f) => (
              <li key={f.id} className="border-b border-line last:border-0">
                <Link href={streetHref({ lat: f.lat, lng: f.lng, name: f.title })} className="group flex items-start gap-4 px-5 py-3.5 transition hover:bg-surface-2/60">
                  <span className="tag tag-gap mt-0.5 shrink-0">{f.label}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium tracking-[-0.01em]">{f.title}</span>
                    <span className="line-clamp-1 text-sm text-fg-3">{f.explanation}</span>
                  </span>
                  {f.demo && <span className="tag tag-demo shrink-0">Demo</span>}
                </Link>
              </li>
            )) : upcoming.slice(0, 4).map((n) => (
              <li key={n.id} className="border-b border-line last:border-0">
                <Link href={streetHref({ lat: n.lat, lng: n.lng, name: n.area_text?.split(/[.(,]/)[0] ?? n.title })} className="group flex items-start gap-4 px-5 py-3.5 transition hover:bg-surface-2/60">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: NOTICE_KINDS[n.kind].color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium tracking-[-0.01em]">{n.title}</span>
                    <span className="line-clamp-1 text-sm text-fg-3">{dayWord(new Date(n.starts_at))} {hhmm(new Date(n.starts_at))}, {n.area_text}</span>
                  </span>
                  <span className={`tag tag-${n.provenance} shrink-0`}>{PROVENANCE[n.provenance]}</span>
                </Link>
              </li>
            ))}
            {findings.length === 0 && upcoming.length === 0 && <li className="px-5 py-6 text-fg-3">Nothing flagged and no notices in force today.</li>}
          </ol>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-1">
          <Figure n={open.filter((c) => c.kind !== "outage").length} label="Open issues" />
          <Figure n={live.length} label="Live power cuts" tone="var(--outage)" />
          <Figure n={findings.length} label="Records to check" tone="var(--works)" />
        </div>
      </div>
    </div>
  );

  const requests = (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:items-start">
      <div>
        <p className="text-lg leading-relaxed text-fg-2">
          Streetlights, garbage, drains, fallen trees. Raise it in public and neighbours vouch instead of filing the same complaint again;
          it closes only when two of them confirm it was done. Parking hotspots work the same way.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/requests" className="group inline-flex items-center gap-1.5 rounded-[8px] bg-fg px-4 py-2.5 text-sm font-medium text-bg transition hover:opacity-85">All requests <Arrow /></Link>
          <Link href="/map?report=request" className="rounded-[8px] border border-line px-4 py-2.5 text-sm transition hover:border-fg-3">Raise one</Link>
        </div>
      </div>
      <Sheet label="Most backed" no="R">
        <ol>
          {asks.slice(0, 4).map((r) => (
            <li key={r.id} className="flex items-center gap-4 border-b border-line px-5 py-3.5 last:border-0">
              <KindBadge kind="request" size={30} />
              <Link href={`/c/${r.id}`} className="min-w-0 flex-1">
                <span className="block truncate font-medium tracking-[-0.01em] hover:underline">{REQUEST_CATEGORIES[r.category ?? "other"].label}</span>
                <span className="block text-sm text-fg-3">{r.reporter_count} {r.reporter_count === 1 ? "resident" : "residents"} asking, {timeAgo(r.last_reported_at)}</span>
              </Link>
              {r.demo && <span className="tag tag-demo hidden shrink-0 sm:inline-flex">Demo</span>}
              <VouchButton id={r.id} initial={r.vouches} compact label="Vouch" />
            </li>
          ))}
          {asks.length === 0 && <li className="px-5 py-6 text-fg-3">No open requests yet.</li>}
        </ol>
      </Sheet>
    </div>
  );

  // One idea per tab: the drawing, a sentence of what it is, and where to see it.
  const feature = (sheet: string, no: string, art: React.ReactNode, title: string, body: string, link?: { href: string; label: string }) => (
    <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-center">
      <Sheet label={sheet} no={no} bodyClassName="p-5">{art}</Sheet>
      <div>
        <h3 className="text-2xl font-semibold leading-tight tracking-[-0.03em]">{title}</h3>
        <p className="mt-3 text-lg leading-relaxed text-fg-2">{body}</p>
        {link && <Link href={link.href} className="group mt-5 inline-flex items-center gap-1.5 font-medium underline decoration-line underline-offset-4 hover:decoration-fg">{link.label} <Arrow /></Link>}
      </div>
    </div>
  );

  return (
    <main className="overflow-x-clip">
      <Hero ticker={ticker} />

      {/* How it works: the whole idea in three steps */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6">
        <BlurFade inView>
          <p className="label text-fg-3">How it works</p>
        </BlurFade>
        <ol className="relative mt-8 grid gap-10 md:grid-cols-3 md:gap-8">
          <span aria-hidden className="lane-mark absolute left-[19px] top-10 hidden h-[2px] w-[calc(100%-40px)] md:block [background:repeating-linear-gradient(to_right,var(--fg-3)_0_10px,transparent_10px_20px)]" />
          {[
            { n: "01", t: "Look up a street", d: "Works and their permissions, power and water cuts, the next 48 hours, and what the records leave out.", href: "/street", cta: "Find yours" },
            { n: "02", t: "Report or vouch", d: "Potholes, flooding, power cuts, blocked parking, or a request like a streetlight. Neighbours back it instead of repeating it.", href: "/map?report=1", cta: "Report something" },
            { n: "03", t: "Send it to who answers", d: "The zone office and the right department, ready to send from your own email or WhatsApp, with an escalation ladder after.", href: "/requests", cta: "See requests" },
          ].map((s, i) => (
            <BlurFade key={s.n} inView delay={i * 0.1}>
              <li className="relative">
                <span className="relative grid h-10 w-10 place-items-center rounded-[10px] border border-line bg-bg font-mono text-sm text-fg">{s.n}</span>
                <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">{s.t}</h3>
                <p className="mt-2 max-w-xs leading-relaxed text-fg-2">{s.d}</p>
                <Link href={s.href} className="group mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-fg-2 transition hover:text-fg">{s.cta} <Arrow /></Link>
              </li>
            </BlurFade>
          ))}
        </ol>
      </section>

      {/* Right now: records, requests and the map, one at a time */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <BlurFade inView>
          <h2 className="display text-[clamp(2rem,4.5vw,3.5rem)]">Right <span className="accent-word">now.</span></h2>
        </BlurFade>
        <BlurFade inView delay={0.06} className="mt-6">
          <Tabs items={[
            { id: "records", label: `Records${findings.length ? ` (${findings.length})` : ""}`, content: today },
            { id: "requests", label: `Requests${asks.length ? ` (${asks.length})` : ""}`, content: requests },
            { id: "map", label: "Live map", content: <MapPreview pins={pins} works={works} /> },
          ]} />
        </BlurFade>
      </section>

      {/* What makes it different: one idea at a time */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <BlurFade inView>
          <p className="label text-accent">What no other civic tracker does</p>
          <h2 className="display mt-4 max-w-3xl text-[clamp(2rem,4.5vw,3.5rem)]">Read the street, not just the <span className="accent-word">complaint.</span></h2>
        </BlurFade>
        <BlurFade inView delay={0.06} className="mt-10">
          <Tabs vertical autoAdvance={7000} items={[
            { id: "strike", label: "Dig strike", hint: "Power cuts beside a trench", content: feature("Dig strike", "01", <StrikeVignette />, "Power cuts traced to the trench beside them",
              "When residents report a power cut near active digging that started before it, Theru flags a possible cable strike for TNPDCL and the digging agency. A correlation to check, never a verdict.",
              strike ? { href: streetHref({ lat: strike.lat, lng: strike.lng, name: "A live example" }), label: "See the live example" } : undefined) },
            { id: "outlook", label: "Next 48 hours", hint: "Shutdowns, suspensions, rain", content: feature("Outlook", "02", <OutlookVignette />, "The next 48 hours on your street",
              "Planned power shutdowns, water suspensions and digging, with the rain forecast turned into a flooding risk wherever water has stood before. Something to plan a day around.",
              { href: "/street", label: "Look up a street" }) },
            { id: "answers", label: "Who answers", hint: "The right office, then escalation", content: feature("Who answers", "03", <LadderVignette />, "The right office for that spot, and what to do next",
              "Every location resolves to its corporation zone and the department for that problem. Send from your own email, WhatsApp or X, then follow a ladder that ends in an RTI request.") },
            { id: "gaps", label: "Evidence gaps", hint: "What the records leave out", content: feature("Evidence gaps", "04", <GapVignette />, "What the records leave out, said carefully",
              "Permissions are checked against completions, resurfacing and each other. A missing completion is reported as a missing record, not as unfinished work, and every finding carries its source.",
              { href: "/records", label: `Read the ${findings.length} findings` }) },
            { id: "merge", label: "Merge and priority", hint: "One record per problem", content: feature("Merge and priority", "05", <div className="space-y-6"><MergeBeams /><PriorityLedger total={136} parts={[
                { label: "Severity 3 of 3", points: 60 }, { label: "5 distinct reporters", points: 40 }, { label: "Open 9 days", points: 21 }, { label: "Beside an active dig", points: 15 }]} compact /></div>,
              "Duplicates merge, neighbours raise it",
              "A report near an open one joins it instead of piling up. Priority is a score anyone can read, and a fix closes only when two neighbours confirm it.") },
          ]} />
        </BlurFade>
      </section>

      {/* Evidence strip */}
      {withPhotos.length > 0 && (
        <section aria-label="Latest evidence" className="relative border-y border-line py-6 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
          <div className="marquee flex w-max gap-4 pr-4">
            {[...withPhotos, ...withPhotos].map((c, i) => (
              <Link key={`${c.id}-${i}`} href={`/c/${c.id}`} aria-hidden={i >= withPhotos.length} tabIndex={i >= withPhotos.length ? -1 : 0}
                className="group relative h-48 w-72 shrink-0 overflow-hidden rounded-[6px] border border-line bg-surface-2">
                <Image src={photoSrc(c.cover_photo)!} alt={`${KINDS[c.kind].label} report`} fill sizes="288px" className="object-cover transition duration-700 group-hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/75 to-transparent p-3 pt-10 text-sm font-medium text-white">
                  <KindBadge kind={c.kind} size={24} /> {c.reporter_count} {c.reporter_count === 1 ? "report" : "reports"}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Coordination */}
      <section className="relative isolate overflow-hidden border-t border-line">
        <div className="absolute inset-0 -z-10 opacity-35 [mask-image:linear-gradient(90deg,transparent,#000_55%)]"><HeroBackdrop /></div>
        <div className="stripes h-1.5 opacity-80" />
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-28 sm:px-6 lg:grid-cols-2 lg:items-end">
          <BlurFade inView>
            <p className="label text-works">The coordination gap</p>
            <h2 className="display mt-4 text-[clamp(2rem,4.5vw,3.5rem)]">The same road, dug up by three agencies in three months.</h2>
          </BlurFade>
          <BlurFade inView delay={0.1}>
            <p className="text-lg leading-relaxed text-fg-2">
              Theru lines up every permission on a stretch. Two agencies about to dig within 60 days of each other are flagged as a chance to
              dig once; a new cut soon after resurfacing is flagged as a conflict; damage beside a dig goes to the agency that dug it.
            </p>
            <Link href="/records" className="group mt-6 inline-flex items-center gap-2 rounded-[8px] bg-works px-5 py-3 font-medium text-[#18160f] transition hover:opacity-85">
              Read the {findings.length} findings <Arrow />
            </Link>
          </BlurFade>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-10 text-sm text-fg-3 sm:px-6">
          <span>{SITE.name}. {SITE.tagline}. Running live in Chennai. Built in 24 hours for the CivicTech track.</span>
          <span className="flex gap-5">
            <Link href="/about" className="transition hover:text-fg">Method and sources</Link>
            <a href="https://github.com/Barath-BDK/Bits-Bytes-Hackathon" className="transition hover:text-fg">Source code</a>
          </span>
        </div>
      </footer>
    </main>
  );
}

function Figure({ n, label, tone }: { n: number; label: string; tone?: string }) {
  return (
    <div className="relative flex flex-col justify-center border-line px-5 py-6 [&:not(:last-child)]:border-r md:[&:not(:last-child)]:border-b md:[&:not(:last-child)]:border-r-0">
      {tone && <span className="absolute inset-x-0 top-0 h-1" style={{ background: tone }} />}
      <NumberTicker value={n} className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl" />
      <span className="label mt-1.5 text-fg-3">{label}</span>
    </div>
  );
}
