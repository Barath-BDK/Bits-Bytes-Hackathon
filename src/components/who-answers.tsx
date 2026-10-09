import type { Contact, Jurisdiction, Step } from "@/lib/jurisdiction";
import { CopyButton } from "@/components/copy-button";

// Who answers for this spot, how to reach them, and an escalation ladder. Sending is always done by the resident.
export function WhoAnswers({ j, contacts, message, subject, ladder, daysOpen }: {
  j: Jurisdiction; contacts: Contact[]; message: string; subject: string; ladder?: Step[]; daysOpen?: number;
}) {
  const all = [...contacts, ...j.contacts].filter((c, i, a) => a.findIndex((x) => x.name === c.name) === i);
  const emails = all.filter((c) => c.email).map((c) => c.email!);
  const mailto = `mailto:${emails.join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const tweet = `https://x.com/intent/post?text=${encodeURIComponent(message.slice(0, 230))}`;
  return (
    <div>
      <p className="text-sm text-fg-2">
        {j.inGcc && j.zone
          ? <>Greater Chennai Corporation, <strong className="text-fg">Zone {j.zone.no} ({j.zone.name})</strong>, {j.region} region. <span className="text-fg-3">Approximate: nearest zone office, not the official ward boundary.</span></>
          : <>Outside Greater Chennai Corporation limits (approximate). The local body falls under the district administration.</>}
      </p>

      <ul className="mt-4 divide-y divide-line border-y border-line">
        {all.map((c) => (
          <li key={c.name} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5 py-3">
            <span className="min-w-0">
              <span className="block font-medium">{c.name}</span>
              <span className="block text-sm text-fg-3">{c.role}</span>
            </span>
            <span className="flex flex-wrap items-center gap-1.5">
              {c.phone && <a href={`tel:${c.phone}`} className="rounded-[6px] border border-line px-2.5 py-1 font-mono text-[12px] hover:border-fg-3">{c.phone}</a>}
              {c.email && <a href={`mailto:${c.email}`} className="rounded-[6px] border border-line px-2.5 py-1 font-mono text-[12px] hover:border-fg-3">{c.email}</a>}
              {c.web && <a href={c.web} target="_blank" rel="noreferrer" className="rounded-[6px] border border-line px-2.5 py-1 text-[12px] hover:border-fg-3">Website</a>}
              <span className={`tag ${c.verified === "official" ? "tag-official" : "tag-verify"}`} title={c.note}>{c.verified === "official" ? "Official page" : "Verify before use"}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        {emails.length > 0 && <a href={mailto} className="rounded-[8px] bg-fg px-4 py-2 text-sm font-medium text-bg hover:opacity-85">Email all ({emails.length})</a>}
        <a href={whatsapp} target="_blank" rel="noreferrer" className="rounded-[8px] border border-line px-4 py-2 text-sm hover:border-fg-3">Share on WhatsApp</a>
        <a href={tweet} target="_blank" rel="noreferrer" className="rounded-[8px] border border-line px-4 py-2 text-sm hover:border-fg-3">Post on X</a>
        <CopyButton text={message} label="Copy message" className="rounded-[8px] border border-line px-4 py-2 text-sm hover:border-fg-3" />
      </div>
      <p className="mt-2 text-xs text-fg-3">Theru never sends anything for you. Messages open in your own email, WhatsApp or X.</p>

      {ladder && (
        <ol className="mt-6 space-y-0">
          {ladder.map((s, i) => {
            const due = daysOpen !== undefined && daysOpen >= s.day && (i === ladder.length - 1 || daysOpen < ladder[i + 1].day);
            return (
              <li key={i} className={`grid grid-cols-[4.5rem_1fr] gap-3 border-l-2 py-2.5 pl-4 ${due ? "border-accent" : "border-line"}`}>
                <span className={`font-mono text-[12px] ${due ? "text-accent" : "text-fg-3"}`}>Day {s.day}</span>
                <span>
                  <span className="block font-medium">{s.who}{due && <span className="tag tag-verify ml-2 align-middle">Due now</span>}</span>
                  <span className="block text-sm text-fg-2">{s.action}</span>
                </span>
              </li>
            );
          })}
          <li className="pl-4 pt-1 text-xs text-fg-3">Suggested timings, counted from the first report. They are not statutory deadlines.</li>
        </ol>
      )}
    </div>
  );
}
