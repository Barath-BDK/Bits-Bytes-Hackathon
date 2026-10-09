import Link from "next/link";
import Image from "next/image";
import { connection } from "next/server";
import { getClusters } from "@/lib/data";
import { KINDS, photoSrc, timeAgo } from "@/lib/issues";
import { KindBadge } from "@/components/kind-icon";
import { BlurFade, NumberTicker, WordReveal } from "@/components/motion-bits";

const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="transition-transform group-hover:translate-x-0.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

export default async function Home() {
  await connection();
  const clusters = await getClusters();
  const open = clusters.filter((c) => c.status === "open");
  const reporters = open.reduce((n, c) => n + c.reporter_count, 0);
  const linked = open.filter((c) => c.near_worksite);
  const withPhotos = open.filter((c) => c.cover_photo);
  const top = open.filter((c) => c.kind !== "worksite").slice(0, 4);

  return (
    <main className="overflow-x-clip">
      {/* Hero */}
      <section className="relative">
        <div className="hairline-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="pointer-events-none absolute left-1/2 top-[-18rem] h-[36rem] w-[60rem] -translate-x-1/2 rounded-full blur-3xl" style={{ background: "radial-gradient(closest-side, var(--glow), transparent)" }} aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-20 text-center sm:px-6 sm:pt-28">
          <BlurFade>
            <Link href="/map" className="group mx-auto inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 py-1 pl-1 pr-3 text-[13px] text-fg-2 backdrop-blur transition hover:border-fg-3">
              <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-fg">Live</span>
              {open.length} open issues across Chennai
              <Arrow />
            </Link>
          </BlurFade>
          <h1 className="display mx-auto mt-7 max-w-4xl text-[clamp(2.6rem,7.2vw,5.8rem)]">
            <WordReveal text="Who dug up your road, and when will they fix it?" delay={0.1} />
          </h1>
          <BlurFade delay={0.45}>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-fg-2">
              Gullywatch puts every pothole, flooded street and work site on one public map. Reports of the same spot
              merge into a single record, every extra neighbour pushes it up the queue, and damage beside an unfinished
              dig is traced back to the agency that dug it.
            </p>
          </BlurFade>
          <BlurFade delay={0.55}>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href="/map?report=1" className="group flex items-center gap-2 rounded-xl bg-fg px-5 py-3 font-medium text-bg transition hover:opacity-85">Report an issue <Arrow /></Link>
              <Link href="/map" className="rounded-xl border border-line bg-surface/60 px-5 py-3 font-medium backdrop-blur transition hover:border-fg-3">Open the live map</Link>
            </div>
          </BlurFade>
        </div>

        {/* Product card */}
        <BlurFade delay={0.7} y={30} className="relative mx-auto max-w-5xl px-4 pb-24 sm:px-6">
          <div className="beam rounded-3xl">
            <div className="grid overflow-hidden rounded-3xl border border-line bg-surface md:grid-cols-[1.4fr_1fr]">
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

      {/* Bento */}
      <section className="mx-auto max-w-6xl px-4 py-28 sm:px-6">
        <BlurFade inView>
          <p className="label text-accent">How a report becomes a priority</p>
          <h2 className="display mt-4 max-w-3xl text-[clamp(2rem,4.5vw,3.5rem)]">One spot, one record, one queue.</h2>
        </BlurFade>
        <div className="mt-12 grid gap-4 md:grid-cols-6">
          <BlurFade inView delay={0.05} className="md:col-span-3">
            <Card title="Report in ten seconds" body="Pick a type, search or tap the map, add a photo. No login. Photos are stripped of location data before they are stored.">
              <div className="flex gap-2">{(["pothole", "waterlogging", "worksite"] as const).map((k) => <KindBadge key={k} kind={k} size={44} />)}</div>
            </Card>
          </BlurFade>
          <BlurFade inView delay={0.1} className="md:col-span-3">
            <Card title="Duplicates merge" body="A report within 25 m of an open pothole, or 75 m of a flooded stretch, joins that record instead of starting a new one.">
              <div className="relative h-11">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="absolute top-1 h-9 w-9 rounded-[10px] border-2 border-surface" style={{ left: `${i * 22}px`, background: "var(--pothole)", opacity: 1 - i * 0.18 }} />
                ))}
                <span className="label absolute left-[110px] top-3 text-fg-2">4 reports, 1 record</span>
              </div>
            </Card>
          </BlurFade>
          <BlurFade inView delay={0.15} className="md:col-span-4">
            <Card title="Neighbours raise it" body="Every point of the score is shown on the record, so anyone can see why one issue ranks above another.">
              <code className="block rounded-xl border border-line bg-surface-2/70 p-3 font-mono text-[12.5px] leading-relaxed text-fg-2">
                20 × severity + 8 × reporters (max 10) + 3 per day open (max 21) + 15 beside an active dig
              </code>
            </Card>
          </BlurFade>
          <BlurFade inView delay={0.2} className="md:col-span-2">
            <Card title="Closed by neighbours" body="A fix counts only when two people nearby confirm it, and they outnumber those who say it is still there.">
              <div className="flex items-center gap-2 text-sm"><span className="rounded-lg bg-ok/15 px-2.5 py-1 font-medium text-ok">Fixed 2</span><span className="rounded-lg bg-surface-2 px-2.5 py-1 text-fg-3">Still there 0</span></div>
            </Card>
          </BlurFade>
        </div>
      </section>

      {/* Coordination */}
      <section className="relative border-t border-line">
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

function Card({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="group h-full rounded-3xl border border-line bg-surface p-7 transition duration-500 hover:border-fg-3 hover:bg-surface-2/50">
      {children}
      <h3 className="mt-6 text-xl font-semibold tracking-[-0.03em]">{title}</h3>
      <p className="mt-2 leading-relaxed text-fg-2">{body}</p>
    </div>
  );
}
