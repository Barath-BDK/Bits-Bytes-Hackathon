import type { Finding } from "@/lib/issues";
import { rtiDraft } from "@/lib/jurisdiction";
import { SITE } from "@/lib/site";
import { dayMonth } from "@/lib/time";
import { CopyButton } from "@/components/copy-button";

const TONE: Record<string, string> = {
  possible_cable_strike: "var(--outage)", joint_works_possible: "var(--ok)", dug_after_resurfacing: "var(--works)",
  completion_not_found: "var(--fg-3)", possible_record_match: "var(--water)", damage_near_works: "var(--pothole)", promised_date_passed: "var(--fg-3)",
};

// A finding states what the records show and what they leave out. Wording comes from the database rules.
export function FindingCard({ f, place }: { f: Finding; place?: string }) {
  const agency = typeof f.refs.agency === "string" ? f.refs.agency : "the agency concerned";
  const reference = typeof f.refs.reference === "string" ? f.refs.reference : null;
  const asksForRecord = ["completion_not_found", "possible_record_match", "dug_after_resurfacing", "damage_near_works", "possible_cable_strike"].includes(f.type);
  return (
    <article className="border-l-2 py-1 pl-4" style={{ borderColor: TONE[f.type] ?? "var(--line)" }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="tag tag-gap">{f.label}</span>
        {f.demo && <span className="tag tag-demo">Demo data</span>}
        <span className="font-mono text-[11px] text-fg-3">{dayMonth(new Date(f.detected_at))}</span>
      </div>
      <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em]">{f.title}</h3>
      <p className="mt-1 leading-relaxed text-fg-2">{f.explanation}</p>
      {asksForRecord && (
        <CopyButton label="Copy an RTI request for the records" className="mt-3 text-sm font-medium underline decoration-line underline-offset-4 hover:decoration-fg"
          text={rtiDraft({ agency, reference, place: place ?? "this location", lat: f.lat, lng: f.lng, pageUrl: `${SITE.url}/street?lat=${f.lat.toFixed(5)}&lng=${f.lng.toFixed(5)}` })} />
      )}
    </article>
  );
}
