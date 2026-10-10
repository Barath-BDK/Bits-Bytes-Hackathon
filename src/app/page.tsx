import Link from "next/link";
import Image from "next/image";
import { getClusters, getFindings, getNotices } from "@/lib/data";
import { KINDS, NOTICE_KINDS, PROVENANCE, isLiveOutage, photoSrc, timeAgo } from "@/lib/issues";
import { dayWord, hhmm, inForceOrSoon } from "@/lib/time";
import { streetHref } from "@/lib/links";
import { SITE } from "@/lib/site";
import { KindBadge } from "@/components/kind-icon";
import { BlurFade, NumberTicker } from "@/components/motion-bits";
import { Hero } from "@/components/hero";
import { Sheet } from "@/components/sheet";
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
  const ticker = [
    ...(live.length ? [`Power reported off in ${live.length} ${live.length === 1 ? "area" : "areas"} right now`] : []),
    ...findings.slice(0, 4).map((f) => `${f.label}: ${f.title.toLowerCase()}`),
    ...upcoming.slice(0, 6).map((n) => `${NOTICE_KINDS[n.kind].label}, ${n.area_text?.split(/[.(]/)[0] ?? n.title}: ${dayWord(new Date(n.starts_at))} ${hhmm(new Date(n.starts_at))}`),
    ...[...open].sort((x, y) => y.last_reported_at.localeCompare(x.last_reported_at)).slice(0, 6).map((c) =>
      c.kind === "worksite"
        ? `${c.department ?? "A work site"} logged, ${timeAgo(c.last_reported_at)}`
        : `${c.reporter_count} ${c.reporter_count === 1 ? "resident reports" : "residents report"} ${KINDS[c.kind].severity[c.severity_max - 1].toLowerCase()} ${KINDS[c.kind].label.toLowerCase()}, ${timeAgo(c.last_reported_at)}`),
  ];

  return (
    <main className="overflow-x-clip">
      <Hero ticker={ticker} />

      {/* Today */}
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6">
        <BlurFade inView y={30}>
          <div className="sheet">
            <div className="grid overflow-hidden md:grid-cols-[1.4fr_1fr]">
              <div className="border-b border-line md:border-b-0 md:border-r">
                <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                  <span className="label text-fg-3">{findings.length ? "The records today" : "In force and coming up"}</span>
                  <Link href="/records" className="label text-fg-3 hover:text-fg">{findings.length ? "All findings" : "All records"}</Link>
                </div>
                {findings.length === 0 && (
                  <ol>
                    {upcoming.slice(0, 4).map((n) => (
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
                    {upcoming.length === 0 && <li className="px-5 py-6 text-fg-3">Nothing flagged and no notices in force today.</li>}
                  </ol>
                )}
                <ol>
                  {findings.slice(0, 4).map((f) => (
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
                  ))}
                </ol>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-1">
                <Figure n={open.filter((c) => c.kind !== "outage").length} label="Open issues" />
                <Figure n={live.length} label="Live power cuts" tone="var(--outage)" />
                <Figure n={findings.length} label="Records to check" tone="var(--works)" />
              </div>
            </div>
          </div>
        </BlurFade>
      </section>

      {/* What only Theru does */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <BlurFade inView>
          <p className="label text-accent">Four things no other civic tracker does</p>
          <h2 className="display mt-4 max-w-3xl text-[clamp(2rem,4.5vw,3.5rem)]">Read the street, not just the <span className="accent-word">complaint.</span></h2>
        </BlurFade>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <BlurFade inView delay={0.05}>
            <Sheet label="Dig strike" no="01" bodyClassName="p-5">
              <StrikeVignette />
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">Power cuts traced to the trench beside them</h3>
              <p className="mt-2 leading-relaxed text-fg-2">
                When residents report a power cut within 150 m of an active excavation that started before it, Theru flags a possible cable strike
                and tells both TNPDCL and the digging agency. It is shown as a correlation to verify, never as a verdict.
              </p>
              {strike && <Link href={streetHref({ lat: strike.lat, lng: strike.lng, name: "Velachery Main Road" })} className="group mt-3 inline-flex items-center gap-1.5 text-sm font-medium">See the live example <Arrow /></Link>}
            </Sheet>
          </BlurFade>
          <BlurFade inView delay={0.1}>
            <Sheet label="Outlook" no="02" bodyClassName="p-5">
              <OutlookVignette />
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">The next 48 hours on your street</h3>
              <p className="mt-2 leading-relaxed text-fg-2">
                Planned power shutdowns, water suspensions and permitted digs, with rain from Open-Meteo turned into a waterlogging risk wherever
                flooding has been reported before. A forecast you can plan a day around.
              </p>
            </Sheet>
          </BlurFade>
          <BlurFade inView delay={0.15}>
            <Sheet label="Who answers" no="03" bodyClassName="p-5">
              <LadderVignette />
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">The right office for that spot, and what to do next</h3>
              <p className="mt-2 leading-relaxed text-fg-2">
                Each location resolves to its corporation zone and region, with the department for that kind of problem. Send from your own email,
                WhatsApp or X, then follow an escalation ladder that ends in an RTI request for the records.
              </p>
            </Sheet>
          </BlurFade>
          <BlurFade inView delay={0.2}>
            <Sheet label="Evidence gaps" no="04" bodyClassName="p-5">
              <GapVignette />
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">What the records leave out, said carefully</h3>
              <p className="mt-2 leading-relaxed text-fg-2">
                Permissions are checked against completions, resurfacing and each other. An expired permission with no completion is reported as a
                missing record, not as unfinished work. Every finding carries its source.
              </p>
            </Sheet>
          </BlurFade>
        </div>
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

      {/* The basics */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <BlurFade inView>
          <p className="label text-fg-3">And the basics, done properly</p>
        </BlurFade>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <BlurFade inView delay={0.05}>
            <Sheet label="Merge" no="05" bodyClassName="p-5">
              <MergeBeams />
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">Duplicates merge into one record</h3>
              <p className="mt-2 leading-relaxed text-fg-2">A report within 25 m of an open pothole, 75 m of a flooded stretch or 300 m of a power cut joins that record.</p>
            </Sheet>
          </BlurFade>
          <BlurFade inView delay={0.1}>
            <Sheet label="Priority" no="06" bodyClassName="p-5">
              <PriorityLedger total={136} parts={[
                { label: "Severity 3 of 3", points: 60 }, { label: "5 distinct reporters", points: 40 },
                { label: "Open 9 days", points: 21 }, { label: "Beside an active dig", points: 15 },
              ]} compact />
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">Neighbours raise it, in the open</h3>
              <p className="mt-2 leading-relaxed text-fg-2">Every point of the score is shown on the record, and a fix closes only when two neighbours confirm it.</p>
            </Sheet>
          </BlurFade>
        </div>
      </section>

      {/* Coordination */}
      <section className="relative isolate overflow-hidden border-t border-line">
        <div className="absolute inset-0 -z-10 opacity-35 [mask-image:linear-gradient(90deg,transparent,#000_55%)]"><HeroBackdrop /></div>
        <div className="stripes h-1.5 opacity-80" />
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-28 sm:px-6 lg:grid-cols-2">
          <BlurFade inView>
            <p className="label text-works">The coordination gap</p>
            <h2 className="display mt-4 text-[clamp(2rem,4.5vw,3.5rem)]">The same road, dug up by three agencies in three months.</h2>
          </BlurFade>
          <BlurFade inView delay={0.1} className="space-y-5 text-lg leading-relaxed text-fg-2">
            <p>
              Theru lines up every permission on a stretch. Two agencies about to dig within 60 days of each other are flagged as a chance to dig once;
              a new cut soon after resurfacing is flagged as a conflict. Damage beside a dig is addressed to the agency that dug it.
            </p>
            <Link href="/records" className="group inline-flex items-center gap-2 rounded-[8px] bg-works px-5 py-3 font-medium text-[#18160f] transition hover:opacity-85">
              Read the {findings.length} findings <Arrow />
            </Link>
          </BlurFade>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-10 text-sm text-fg-3 sm:px-6">
          <span><span className="font-tamil text-fg-2">{SITE.tamil}</span> {SITE.name}. {SITE.tagline}. Built in 24 hours for the CivicTech track.</span>
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
