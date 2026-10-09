import Link from "next/link";
import Image from "next/image";
import { connection } from "next/server";
import { getClusters } from "@/lib/data";
import { KINDS, photoSrc, timeAgo } from "@/lib/issues";

export default async function Home() {
  await connection();
  const clusters = await getClusters();
  const open = clusters.filter((c) => c.status === "open");
  const reporters = open.reduce((n, c) => n + c.reporter_count, 0);
  const linked = open.filter((c) => c.near_worksite);
  const withPhotos = open.filter((c) => c.cover_photo);
  const top = open.filter((c) => c.kind !== "worksite").slice(0, 3);

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-rule">
        <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(var(--rule)_1px,transparent_1px),linear-gradient(90deg,var(--rule)_1px,transparent_1px)] [background-size:56px_56px]" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.25fr_1fr] lg:pb-24 lg:pt-20">
          <div>
            <p className="kicker rise flex items-center gap-2 text-ink-2">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pothole opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-pothole" /></span>
              Chennai · public works ledger
            </p>
            <h1 className="rise mt-5 font-display text-[clamp(2.75rem,7vw,6.25rem)] leading-[0.95] tracking-tight [animation-delay:80ms]">
              Who dug up <span className="italic text-pothole">your</span> road, and when will they fix it?
            </h1>
            <p className="rise mt-6 max-w-xl text-lg text-ink-2 [animation-delay:160ms]">
              Gullywatch puts every pothole, flooded street and work site on one public map. Reports of the same spot
              merge into a single record, so each extra neighbour pushes it up the queue, and damage next to an
              unfinished dig is traced back to the agency that dug it.
            </p>
            <div className="rise mt-8 flex flex-wrap gap-3 [animation-delay:240ms]">
              <Link href="/map?report=1" className="rounded-full bg-ink px-6 py-3 font-medium text-paper hover:opacity-90">Report an issue</Link>
              <Link href="/map" className="rounded-full border border-ink px-6 py-3 font-medium hover:bg-paper-2">Open the live map</Link>
            </div>
          </div>

          {/* Ledger card */}
          <div className="rise relative [animation-delay:200ms]">
            <div className="rounded-2xl border border-ink bg-paper shadow-[var(--shadow)]">
              <div className="flex items-center justify-between border-b border-ink px-5 py-3">
                <span className="kicker">Today&apos;s top of the queue</span>
                <span className="kicker text-ink-3">{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              </div>
              <ol>
                {top.map((c, i) => (
                  <li key={c.id} className="border-b border-rule last:border-0">
                    <Link href={`/c/${c.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-paper-2">
                      <span className="font-display text-4xl leading-none text-ink-3">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="kicker" style={{ color: KINDS[c.kind].color }}>{KINDS[c.kind].label} · {KINDS[c.kind].severity[c.severity_max - 1]}</span>
                        <span className="mt-0.5 block font-medium">{c.reporter_count} reporters · first seen {timeAgo(c.first_reported_at)}</span>
                        {c.near_worksite && <span className="mt-1 inline-flex items-center gap-1.5 text-xs"><span className="stripes h-2 w-4 rounded-sm" />beside an active dig</span>}
                      </span>
                      <span className="font-display text-3xl">{c.priority}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Figure n={open.length} label="open issues" />
              <Figure n={reporters} label="residents reporting" />
              <Figure n={linked.length} label="traced to a dig" stripe />
            </div>
          </div>
        </div>
      </section>

      {/* Evidence strip */}
      <section aria-label="Latest evidence" className="overflow-hidden border-b border-rule py-6">
        <div className="marquee flex w-max gap-4 pr-4">
          {[...withPhotos, ...withPhotos].map((c, i) => (
            <Link key={`${c.id}-${i}`} href={`/c/${c.id}`} className="group relative h-44 w-64 shrink-0 overflow-hidden rounded-xl bg-paper-3" aria-hidden={i >= withPhotos.length} tabIndex={i >= withPhotos.length ? -1 : 0}>
              <Image src={photoSrc(c.cover_photo)!} alt={`${KINDS[c.kind].label} report`} fill sizes="256px" className="object-cover transition duration-500 group-hover:scale-105" />
              <span className="kicker absolute left-2 top-2 rounded px-2 py-1 text-paper" style={{ background: KINDS[c.kind].color, color: c.kind === "worksite" ? "#18160f" : undefined }}>
                {KINDS[c.kind].label}
              </span>
              <span className="kicker absolute bottom-2 left-2 rounded bg-paper/90 px-2 py-1">{c.reporter_count} reports</span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <p className="kicker text-ink-3">How a report becomes a priority</p>
        <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-rule bg-rule md:grid-cols-3">
          {[
            ["01", "Report in ten seconds", "Pick pothole, waterlogging or work site, drop a pin, add a photo. No login. Photos are stripped of location data before storage."],
            ["02", "Duplicates merge", "A report within 25 m of an open pothole (75 m for flooding) joins that record instead of starting a new one. One spot, one record."],
            ["03", "Neighbours raise it", "Priority = 20 × severity + 8 × distinct reporters + 3 per day open + 15 if beside an active dig. Every point is shown on the record."],
          ].map(([n, t, body]) => (
            <div key={n} className="bg-paper p-7">
              <span className="font-display text-5xl text-ink-3">{n}</span>
              <h3 className="mt-4 font-display text-2xl">{t}</h3>
              <p className="mt-2 text-ink-2">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Coordination */}
      <section className="border-y border-ink bg-ink text-paper">
        <div className="stripes h-2" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="kicker opacity-70">The coordination gap</p>
            <h2 className="mt-4 font-display text-5xl leading-[1.02]">The same road, dug up by three agencies in three months.</h2>
          </div>
          <div className="space-y-4 text-lg opacity-90">
            <p>
              Residents log work sites straight from the signboard: which agency, and the date they promised to finish.
              When a pothole or flood appears within 60 m of an unfinished dig, Gullywatch flags it and addresses the
              complaint to both the city and the agency that dug there.
            </p>
            <p>Overdue works turn red. Nothing is closed until two neighbours confirm the fix.</p>
            <Link href="/map" className="inline-block rounded-full bg-works px-6 py-3 font-medium text-[#18160f] hover:opacity-90">See the {linked.length} flagged spots</Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-10 text-sm text-ink-3 sm:px-6">
        <span>Gullywatch · built in 24 hours for the CivicTech track.</span>
        <span className="flex gap-4">
          <Link href="/about" className="hover:text-ink">How it works &amp; credits</Link>
          <a href="https://github.com/Barath-BDK/Bits-Bytes-Hackathon" className="hover:text-ink">Source</a>
        </span>
      </footer>
    </main>
  );
}

function Figure({ n, label, stripe }: { n: number; label: string; stripe?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-rule bg-paper-2">
      {stripe && <div className="stripes h-1.5" />}
      <div className="px-2 py-3">
        <div className="font-display text-4xl leading-none">{n}</div>
        <div className="kicker mt-1.5 text-[0.55rem] text-ink-2">{label}</div>
      </div>
    </div>
  );
}
