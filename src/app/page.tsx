import Link from "next/link";
import Image from "next/image";
import { getClusters } from "@/lib/data";
import { KINDS, photoSrc, timeAgo } from "@/lib/issues";
import { KindBadge } from "@/components/kind-icon";
import { BlurFade, NumberTicker } from "@/components/motion-bits";
import { Hero } from "@/components/hero";
import { Sheet } from "@/components/sheet";
import { DropPin, FixedStamp, MergeBeams, PriorityLedger } from "@/components/vignettes";
import { HeroBackdrop } from "@/components/backdrops/hero-backdrop";

const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="transition-transform group-hover:translate-x-0.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

// Pre-rendered and served from the edge; regenerated on writes (revalidateTag) or every minute.
export const revalidate = 60;

export default async function Home() {
  const clusters = await getClusters();
  const open = clusters.filter((c) => c.status === "open");
  const reporters = open.reduce((n, c) => n + c.reporter_count, 0);
  const linked = open.filter((c) => c.near_worksite);
  const withPhotos = open.filter((c) => c.cover_photo);
  const top = open.filter((c) => c.kind !== "worksite").slice(0, 4);
  const ticker = [...open].sort((x, y) => y.last_reported_at.localeCompare(x.last_reported_at)).slice(0, 8).map((c) =>
    c.kind === "worksite"
      ? `${c.department ?? "A work site"} logged as ${KINDS[c.kind].severity[c.severity_max - 1].toLowerCase()}, ${timeAgo(c.last_reported_at)}`
      : `${c.reporter_count} ${c.reporter_count === 1 ? "resident flags" : "residents flag"} ${KINDS[c.kind].severity[c.severity_max - 1].toLowerCase()} ${KINDS[c.kind].label.toLowerCase()}, ${timeAgo(c.last_reported_at)}`);

  return (
    <main className="overflow-x-clip">
      <Hero openCount={open.length} ticker={ticker} />

      {/* Product card */}
      <section className="relative">
        <BlurFade delay={0.7} y={30} className="relative mx-auto max-w-5xl px-4 pb-24 pt-16 sm:px-6">
          <div className="sheet">
            <div className="grid overflow-hidden md:grid-cols-[1.4fr_1fr]">
              <div className="border-b border-line md:border-b-0 md:border-r">
                <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                  <span className="label text-fg-3">Top of the queue today</span>
                  <span className="label text-fg-3">Priority</span>
                </div>
                <ol>
                  {top.map((c) => (
                    <li key={c.id} className="border-b border-line last:border-0">
                      <Link href={`/c/${c.id}`} className="group flex items-center gap-4 px-5 py-3.5 transition hover:bg-surface-2/60">
                        <KindBadge kind={c.kind} size={36} />
                        <span className="min-w-0 flex-1 text-left">
                          <span className="block truncate font-medium tracking-[-0.01em]">{KINDS[c.kind].severity[c.severity_max - 1]} {KINDS[c.kind].label.toLowerCase()}</span>
                          <span className="block truncate text-sm text-fg-3">
                            {c.reporter_count} residents, first seen {timeAgo(c.first_reported_at)}{c.near_worksite ? ", beside an active dig" : ""}
                          </span>
                        </span>
                        <span className="text-2xl font-semibold tabular-nums tracking-[-0.04em]">{c.priority}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-1">
                <Figure n={open.length} label="Open issues" />
                <Figure n={reporters} label="Residents reporting" />
                <Figure n={linked.length} label="Traced to a dig" accent />
              </div>
            </div>
          </div>
        </BlurFade>
      </section>

      {/* Evidence strip */}
      <section aria-label="Latest evidence" className="relative border-y border-line py-6 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="marquee flex w-max gap-4 pr-4">
          {[...withPhotos, ...withPhotos].map((c, i) => (
            <Link key={`${c.id}-${i}`} href={`/c/${c.id}`} aria-hidden={i >= withPhotos.length} tabIndex={i >= withPhotos.length ? -1 : 0}
              className="group relative h-48 w-72 shrink-0 overflow-hidden rounded-2xl border border-line bg-surface-2">
              <Image src={photoSrc(c.cover_photo)!} alt={`${KINDS[c.kind].label} report`} fill sizes="288px" className="object-cover transition duration-700 group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/75 to-transparent p-3 pt-10 text-sm font-medium text-white">
                <KindBadge kind={c.kind} size={24} /> {c.reporter_count} {c.reporter_count === 1 ? "report" : "reports"}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works: four drawing sheets */}
      <section className="mx-auto max-w-6xl px-4 py-28 sm:px-6">
        <BlurFade inView>
          <p className="label text-accent">How a report becomes a priority</p>
          <h2 className="display mt-4 max-w-3xl text-[clamp(2rem,4.5vw,3.5rem)]">One spot, one record, one <span className="accent-word">queue.</span></h2>
        </BlurFade>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <BlurFade inView delay={0.05}>
            <Sheet label="Report" no="01" bodyClassName="p-5">
              <DropPin />
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">Report in ten seconds</h3>
              <p className="mt-2 leading-relaxed text-fg-2">Pick a type, search or tap the map, add a photo. No login. Photos are stripped of location data before they are stored.</p>
            </Sheet>
          </BlurFade>
          <BlurFade inView delay={0.1}>
            <Sheet label="Merge" no="02" bodyClassName="p-5">
              <MergeBeams />
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">Duplicates merge</h3>
              <p className="mt-2 leading-relaxed text-fg-2">A report within 25 m of an open pothole, or 75 m of a flooded stretch, joins that record instead of starting a new one.</p>
            </Sheet>
          </BlurFade>
          <BlurFade inView delay={0.15}>
            <Sheet label="Priority" no="03" bodyClassName="p-5">
              <PriorityLedger total={136} parts={[
                { label: "Severity 3 of 3", points: 60 }, { label: "5 distinct reporters", points: 40 },
                { label: "Open 9 days", points: 21 }, { label: "Beside an active dig", points: 15 },
              ]} compact />
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">Neighbours raise it</h3>
              <p className="mt-2 leading-relaxed text-fg-2">20 per severity step, 8 per distinct reporter, 3 per day open, 15 beside an active dig. Every point is shown on the record.</p>
            </Sheet>
          </BlurFade>
          <BlurFade inView delay={0.2}>
            <Sheet label="Close" no="04" bodyClassName="p-5">
              <FixedStamp />
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">Closed by neighbours</h3>
              <p className="mt-2 leading-relaxed text-fg-2">A fix counts only when two people nearby confirm it, and they outnumber those who say it is still there.</p>
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
              Residents log work sites straight from the signboard: which agency, and the date it promised to finish.
              When a pothole or flood appears within 60 m of an unfinished dig, Gullywatch flags it and addresses the
              complaint to both the city and the agency that dug there.
            </p>
            <p>Overdue works turn red. Nothing closes until two neighbours confirm the fix.</p>
            <Link href="/map" className="group inline-flex items-center gap-2 rounded-xl bg-works px-5 py-3 font-medium text-[#18160f] transition hover:opacity-85">
              See the {linked.length} flagged spots <Arrow />
            </Link>
          </BlurFade>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-10 text-sm text-fg-3 sm:px-6">
          <span>Gullywatch, built in 24 hours for the CivicTech track.</span>
          <span className="flex gap-5">
            <Link href="/about" className="transition hover:text-fg">Method and credits</Link>
            <a href="https://github.com/Barath-BDK/Bits-Bytes-Hackathon" className="transition hover:text-fg">Source</a>
          </span>
        </div>
      </footer>
    </main>
  );
}

function Figure({ n, label, accent }: { n: number; label: string; accent?: boolean }) {
  return (
    <div className="relative flex flex-col justify-center border-line px-5 py-6 [&:not(:last-child)]:border-r md:[&:not(:last-child)]:border-b md:[&:not(:last-child)]:border-r-0">
      {accent && <span className="stripes absolute inset-x-0 top-0 h-1" />}
      <NumberTicker value={n} className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl" />
      <span className="label mt-1.5 text-fg-3">{label}</span>
    </div>
  );
}
