import type { Metadata } from "next";
import credits from "../../../public/seed/credits.json";
import { BlurFade } from "@/components/motion-bits";
import { Sheet } from "@/components/sheet";

export const metadata: Metadata = { title: "Method and sources" };

const RULES = [
  ["Possible cable strike", "Requires verification", "A power cut reported in the last 6 hours lies within 150 m of an active excavation (a resident-reported work site, or a road-cutting permission in force) that began before the outage. Correlation only: the cause has to be confirmed by TNPDCL."],
  ["Completion record not found", "Information incomplete", "A road-cutting permission's validity period has ended and no completion record matches it with a score of 70 or more. This describes the record, not the road."],
  ["Possible record match", "Requires verification", "A completion matches a permission by agency, distance and date but not by reference (score 40 to 199). It needs a person to confirm it before it counts."],
  ["Dig-once conflict", "Coordination", "A new excavation is permitted within 80 m of a stretch resurfaced in the previous 180 days."],
  ["Coordination opportunity", "Coordination", "Two different agencies hold permissions within 100 m of each other starting within 60 days of each other."],
  ["Restoration responsibility unclear", "Requires verification", "An open pothole or waterlogging report lies within 60 m of works active in the last 30 days. Whether restoration falls to the digging agency depends on its permission conditions."],
  ["Completion not confirmed", "Information incomplete", "The completion date residents read off a work-site signboard has passed and no completion has been confirmed."],
];

const MATCH = [["Same permission reference", "+100"], ["Same agency", "+40"], ["Within 50 m (or within 150 m)", "+30 (+15)"], ["Completion dated inside the permission window, or up to 60 days after", "+30"]];

export default function About() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-14 sm:px-6">
      <BlurFade>
        <p className="label text-fg-3">Method</p>
        <h1 className="display mt-3 text-[clamp(2.4rem,6vw,4.2rem)]">How Theru reads a <span className="accent-word">street.</span></h1>
        <p className="mt-6 text-lg leading-relaxed text-fg-2">
          Theru is an information layer, not a complaint portal. It brings together residents&apos; reports, published records and a weather forecast for one
          street at a time, says what they show, and is careful about what they do not. It never sends anything on your behalf and never claims an agency
          failed unless a record says so.
        </p>
      </BlurFade>

      <div className="mt-12 space-y-8">
        <Sheet label="Where the data comes from" no="01" bodyClassName="space-y-4 p-6 text-fg-2">
          <p><span className="tag tag-community mr-2">Resident reports</span>Potholes, waterlogging, work sites, power cuts, parking hotspots and community requests reported here. Reports of the same thing merge: 25 m for potholes, 75 m for waterlogging, 50 m for work sites, 40 m for parking and for requests of the same kind, 300 m for power cuts (a power cut only merges with reports from the last 6 hours). A vouch adds one supporter without a new report; each person counts once.</p>
          <p><span className="tag tag-news mr-2">News report</span>Incidents published by news outlets, with a link to the article.</p>
          <p><span className="tag tag-official mr-2">Official record</span>Published permissions, completions and shutdown schedules, each with its source link and import date. Live government feeds are not integrated: TNPDCL publishes planned shutdowns behind a captcha, so they are entered from published lists.</p>
          <p><span className="tag tag-osm mr-2">OpenStreetMap</span>Roads, flyovers and metro lines mapped as under construction (Chennai Metro Phase 2, the Port to Maduravoyal expressway and others), cut into stretches of about 800 m, each linked to the map way it came from. OpenStreetMap records that works exist, not when they began or end, so these show as ongoing.</p>
          <p><span className="tag tag-demo mr-2">Demo data</span>A small set of illustrative resident reports, placed beside real mapped works so the rules can be seen working. They carry this label wherever they appear, and so does any finding that relies on one. Road-cutting permissions and completion records are not published as open data, so the permission-matching rules wait for real records.</p>
          <p>Rain comes from the Open-Meteo forecast. Place search uses Photon and Nominatim, both built on OpenStreetMap.</p>
        </Sheet>

        <Sheet label="What the records show: the rules" no="02" bodyClassName="p-6">
          <ul className="divide-y divide-line">
            {RULES.map(([name, label, rule]) => (
              <li key={name} className="grid grid-cols-1 gap-2 py-4 md:grid-cols-[14rem_1fr]">
                <span><span className="block font-medium">{name}</span><span className="tag tag-gap mt-1">{label}</span></span>
                <span className="leading-relaxed text-fg-2">{rule}</span>
              </li>
            ))}
          </ul>
        </Sheet>

        <Sheet label="Matching a completion to its permission" no="03" bodyClassName="p-6">
          <p className="text-fg-2">An exact reference is strong evidence. Without one, compatible fields add up to an explainable score out of 200:</p>
          <table className="mt-4 w-full text-sm">
            <tbody>{MATCH.map(([s, w]) => <tr key={s} className="border-b border-line"><td className="py-2 pr-4 text-fg-2">{s}</td><td className="py-2 text-right font-mono">{w}</td></tr>)}</tbody>
          </table>
          <p className="mt-4 text-sm text-fg-3">70 or more counts as a match for the completion check; any proximity-only match is still shown for manual review.</p>
        </Sheet>

        <Sheet label="The 48-hour outlook" no="04" bodyClassName="space-y-3 p-6 text-fg-2">
          <p>Planned power shutdowns, water suspensions and road-cutting permissions whose area covers the street within 500 m, plus live power cuts reported nearby.</p>
          <p>Waterlogging risk per hour: <span className="font-mono text-fg">high</span> if forecast rain is at least 7.5 mm, or at least 2.5 mm where waterlogging has been reported within 600 m before; <span className="font-mono text-fg">moderate</span> at 2.5 mm, or 0.5 mm with a history. A rule of thumb, not a flood model.</p>
        </Sheet>

        <Sheet label="Who answers, and its limits" no="05" bodyClassName="space-y-3 p-6 text-fg-2">
          <p>A location is matched to the nearest Greater Chennai Corporation zone office. This is an approximation of the official ward boundaries, and the page says so.</p>
          <p>Contacts are marked <span className="tag tag-official">Official page</span> or <span className="tag tag-verify">Verify before use</span>. Zonal phone numbers and some department emails come from public directories and may be out of date.</p>
          <p>Escalation timings (day 0, 3, 7, 15) are this project&apos;s suggestion, not statutory deadlines.</p>
        </Sheet>

        <Sheet label="Privacy and safety" no="06" bodyClassName="p-6 text-fg-2">
          No accounts. Reporters are counted by a salted hash of their network address; raw addresses are never stored. Photos are re-encoded on the server,
          which strips location metadata. All writes go through validated, rate-limited server routes, and the database refuses anything without the server&apos;s key.
        </Sheet>

        <Sheet label="Photo credits" no="07" bodyClassName="p-6">
          <p className="text-fg-2">Every photo on this site was downloaded from Wikimedia Commons and is used under the licence shown.</p>
          <ul className="mt-4 divide-y divide-line text-sm">
            {credits.map((c) => (
              <li key={c.file} className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-[1fr_auto]">
                <span>
                  <a href={c.source} className="underline decoration-line underline-offset-4 hover:decoration-fg">{c.title}</a>
                  {c.author && <span className="text-fg-3">, {c.author}</span>}
                </span>
                {c.license_url ? <a href={c.license_url} className="label text-fg-3 hover:text-fg">{c.license}</a> : <span className="label text-fg-3">{c.license}</span>}
              </li>
            ))}
          </ul>
        </Sheet>
      </div>
    </main>
  );
}
