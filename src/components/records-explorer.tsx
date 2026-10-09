"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { NOTICE_KINDS, PROVENANCE, type Finding, type Notice, type NoticeKind } from "@/lib/issues";
import { streetHref } from "@/lib/links";
import { SITE } from "@/lib/site";

const EASE = [0.2, 0.8, 0.2, 1] as const;
const fmt = (s: string) => new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

// A plain-text evidence report: facts, sources and open questions. No claims beyond the records.
function report(findings: Finding[], notices: Notice[]) {
  const lines = [
    `${SITE.name} evidence report`, `Generated ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST from ${SITE.url}/records`, "",
    "Findings describe what the records show and what they leave out. A missing record is not evidence that work was not done.",
    "Items marked DEMO are synthetic records used to demonstrate the workflow.", "",
  ];
  findings.forEach((f, i) => {
    lines.push(`${i + 1}. ${f.title} [${f.label}]${f.demo ? " DEMO" : ""}`, `   ${f.explanation}`, `   Location: ${f.lat.toFixed(5)}, ${f.lng.toFixed(5)}`);
    const q = f.type === "completion_not_found" ? "Was the work completed and the road restored? Request the completion and restoration records."
      : f.type === "possible_record_match" ? "Do these two records describe the same work? Confirm the permission reference with the agency."
      : f.type === "possible_cable_strike" ? "What caused the outage? Ask TNPDCL whether an underground cable was damaged, and by whom."
      : f.type === "dug_after_resurfacing" ? "Why was the new surface cut so soon? Ask whether the works were coordinated before resurfacing."
      : f.type === "joint_works_possible" ? "Can the two agencies schedule a single excavation?"
      : "Who is responsible for restoring this stretch under the permission conditions?";
    lines.push(`   Open question: ${q}`, "");
  });
  lines.push("Records referenced:");
  notices.forEach((n) => lines.push(`- ${NOTICE_KINDS[n.kind].label}: ${n.title} (${n.agency}${n.reference ? `, ref ${n.reference}` : ""}), ${fmt(n.starts_at)}. ${PROVENANCE[n.provenance]}${n.source_url ? `: ${n.source_url}` : ""}`));
  return lines.join("\n");
}

export function RecordsExplorer({ findings, notices }: { findings: Finding[]; notices: Notice[] }) {
  const types = useMemo(() => [...new Map(findings.map((f) => [f.type, f.label])).entries()], [findings]);
  const [type, setType] = useState<string>("all");
  const [kind, setKind] = useState<NoticeKind | "all">("all");
  const [q, setQ] = useState("");
  const shownF = findings.filter((f) => type === "all" || f.type === type);
  const shownN = notices.filter((n) => (kind === "all" || n.kind === kind) &&
    (!q || `${n.title} ${n.agency} ${n.area_text ?? ""} ${n.reference ?? ""}`.toLowerCase().includes(q.toLowerCase())));

  function download() {
    const blob = new Blob([report(shownF, notices)], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `theru-evidence-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-14">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">Findings</h2>
          <button onClick={download} className="rounded-[8px] bg-fg px-4 py-2 text-sm font-medium text-bg hover:opacity-85">Download evidence report</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {[["all", "All"] as [string, string], ...types].map(([t, label]) => (
            <button key={t} onClick={() => setType(t)} aria-pressed={type === t}
              className={`rounded-[6px] border px-3 py-1.5 text-sm transition ${type === t ? "border-fg bg-fg text-bg" : "border-line text-fg-2 hover:border-fg-3"}`}>
              {label} <span className="font-mono text-xs opacity-60">{t === "all" ? findings.length : findings.filter((f) => f.type === t).length}</span>
            </button>
          ))}
        </div>
        <motion.ul layout className="mt-6 divide-y divide-line border-y border-line">
          <AnimatePresence initial={false}>
            {shownF.map((f) => (
              <motion.li key={f.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}
                className="grid gap-2 py-4 md:grid-cols-[13rem_1fr_auto] md:gap-6">
                <span className="flex flex-wrap items-start gap-1.5">
                  <span className="tag tag-gap">{f.label}</span>
                  {f.demo && <span className="tag tag-demo">Demo</span>}
                </span>
                <span>
                  <span className="block font-medium">{f.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-fg-2">{f.explanation}</span>
                </span>
                <Link href={streetHref({ lat: f.lat, lng: f.lng, name: f.title })} className="self-start whitespace-nowrap text-sm underline decoration-line underline-offset-4 hover:decoration-fg">Street record</Link>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">Records</h2>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search agency, place or reference" aria-label="Search records"
            className="min-w-0 flex-1 rounded-[8px] border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent md:max-w-sm" />
          <select value={kind} onChange={(e) => setKind(e.target.value as NoticeKind | "all")} aria-label="Record type"
            className="rounded-[8px] border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent">
            <option value="all">All types</option>
            {(Object.keys(NOTICE_KINDS) as NoticeKind[]).map((k) => <option key={k} value={k}>{NOTICE_KINDS[k].label}</option>)}
          </select>
        </div>
        <div className="mt-4 overflow-x-auto" data-lenis-prevent>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="label text-fg-3">
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-normal">Type</th><th className="py-2 pr-4 font-normal">Record</th>
                <th className="py-2 pr-4 font-normal">Dates</th><th className="py-2 pr-4 font-normal">Reference</th><th className="py-2 font-normal">Source</th>
              </tr>
            </thead>
            <tbody>
              {shownN.map((n) => (
                <tr key={n.id} className="border-b border-line align-top">
                  <td className="py-3 pr-4"><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: NOTICE_KINDS[n.kind].color }} />{NOTICE_KINDS[n.kind].label}</span></td>
                  <td className="py-3 pr-4">
                    <Link href={streetHref({ lat: n.lat, lng: n.lng, name: n.area_text ?? n.title })} className="font-medium underline decoration-line underline-offset-4 hover:decoration-fg">{n.title}</Link>
                    <span className="block text-fg-3">{n.agency}</span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-[12px] text-fg-2">{fmt(n.starts_at)}{n.ends_at && <><br />to {fmt(n.ends_at)}</>}</td>
                  <td className="py-3 pr-4 font-mono text-[12px] text-fg-2">{n.reference ?? <span className="text-fg-3">Not recorded</span>}</td>
                  <td className="py-3">
                    <span className={`tag tag-${n.provenance}`}>{PROVENANCE[n.provenance]}</span>
                    {n.source_url && <a href={n.source_url} target="_blank" rel="noreferrer" className="mt-1 block text-[12px] underline decoration-line underline-offset-4 hover:decoration-fg">{n.source_name}</a>}
                  </td>
                </tr>
              ))}
              {shownN.length === 0 && <tr><td colSpan={5} className="py-6 text-fg-3">No records match.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
