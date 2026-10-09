import type { Metadata } from "next";
import credits from "../../../public/seed/credits.json";

export const metadata: Metadata = { title: "How it works & credits" };

const STACK = [
  ["Next.js", "MIT", "https://nextjs.org"],
  ["Supabase (Postgres + PostGIS)", "Apache-2.0 / GPL-2.0", "https://supabase.com"],
  ["MapLibre GL JS", "BSD-3-Clause", "https://maplibre.org"],
  ["OpenFreeMap tiles · OpenStreetMap data", "ODbL", "https://openfreemap.org"],
  ["Lenis", "MIT", "https://lenis.dev"],
  ["Tailwind CSS", "MIT", "https://tailwindcss.com"],
  ["Zod", "MIT", "https://zod.dev"],
  ["sharp", "Apache-2.0", "https://sharp.pixelplumbing.com"],
  ["Vercel Blob", "hosted service", "https://vercel.com/storage/blob"],
  ["Gloock, Atkinson Hyperlegible Next, Martian Mono", "SIL OFL 1.1", "https://fonts.google.com"],
];

export default function About() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-12 sm:px-6">
      <p className="kicker text-ink-3">How it works</p>
      <h1 className="mt-3 font-display text-5xl leading-[1.02] sm:text-6xl">One spot, one record, one queue.</h1>

      <div className="mt-10 space-y-8 text-lg text-ink-2">
        <section>
          <h2 className="font-display text-3xl text-ink">Clustering</h2>
          <p className="mt-2">
            Each report is matched in the database (PostGIS) against open records of the same type nearby: 25 m for
            potholes, 75 m for waterlogging, 50 m for work sites. A match joins the existing record and moves its pin to
            the centre of all reports; otherwise a new record starts. Reports are processed one at a time per type, so
            two people reporting the same pothole at the same moment cannot create two records.
          </p>
        </section>
        <section>
          <h2 className="font-display text-3xl text-ink">Priority</h2>
          <p className="mt-2 font-mono text-sm text-ink">20 × worst severity + 8 × distinct reporters (max 10) + 3 per day open (max 21) + 15 if within 60 m of an active work site</p>
          <p className="mt-2">
            Reporters are counted by an anonymous salted hash of their network address, so one person reporting five
            times counts once. Raw addresses are never stored.
          </p>
        </section>
        <section>
          <h2 className="font-display text-3xl text-ink">Closing the loop</h2>
          <p className="mt-2">
            A record is marked fixed only when at least two neighbours say so and they outnumber those who say it is
            still there. Complaint drafts are filled from a fixed template using only what is on the record.
          </p>
        </section>
        <section>
          <h2 className="font-display text-3xl text-ink">Privacy and safety</h2>
          <p className="mt-2">
            No accounts. Photos are re-encoded on the server, which strips location metadata. All writes go through
            validated, rate-limited server routes; the database rejects anything that does not carry the server&apos;s key.
          </p>
        </section>
      </div>

      <section className="mt-16">
        <h2 className="font-display text-3xl">Open-source libraries and services</h2>
        <ul className="mt-4 divide-y divide-rule border-y border-rule">
          {STACK.map(([name, license, url]) => (
            <li key={name} className="flex justify-between gap-4 py-2.5">
              <a href={url} className="underline decoration-rule underline-offset-4 hover:decoration-ink">{name}</a>
              <span className="kicker text-ink-3">{license}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-3xl">Photo credits</h2>
        <p className="mt-2 text-ink-2">
          Demo photos are from Wikimedia Commons under the licenses below. Locations and report text in the demo data are illustrative.
        </p>
        <ul className="mt-4 divide-y divide-rule border-y border-rule text-sm">
          {credits.map((c) => (
            <li key={c.file} className="grid gap-1 py-2.5 sm:grid-cols-[1fr_auto]">
              <span>
                <a href={c.source} className="underline decoration-rule underline-offset-4 hover:decoration-ink">{c.title}</a>
                {c.author && <span className="text-ink-3"> · {c.author}</span>}
              </span>
              {c.license_url ? <a href={c.license_url} className="kicker text-ink-3 hover:text-ink">{c.license}</a> : <span className="kicker text-ink-3">{c.license}</span>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
