import type { Metadata } from "next";
import { getClusters, getFindings, getNotices } from "@/lib/data";
import { NOTICE_KINDS, type NoticeKind } from "@/lib/issues";
import { dayMonth } from "@/lib/time";
import { Sheet } from "@/components/sheet";
import { BlurFade, NumberTicker } from "@/components/motion-bits";
import { RecordsExplorer } from "@/components/records-explorer";

export const metadata: Metadata = { title: "Records" };
export const revalidate = 60;

export default async function RecordsPage() {
  const [findings, notices, clusters] = await Promise.all([getFindings(), getNotices(), getClusters()]);
  const permits = notices.filter((n) => n.kind === "road_permit");
  const refs = new Set(notices.filter((n) => n.kind === "completion" && n.reference).map((n) => n.reference));
  const matchedByRef = permits.filter((p) => p.reference && refs.has(p.reference)).length;
  const demo = notices.filter((n) => n.provenance === "demo").length + clusters.filter((c) => c.demo).length;
  const real = notices.length + clusters.length - demo;
  const byKind = (Object.keys(NOTICE_KINDS) as NoticeKind[]).map((k) => [k, notices.filter((n) => n.kind === k).length] as const).filter(([, n]) => n > 0);
  const maxKind = Math.max(1, ...byKind.map(([, n]) => n));
  const imported = notices.reduce((m, n) => (n.imported_at > m ? n.imported_at : m), "");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-14 sm:px-6">
      <BlurFade>
        <p className="label text-fg-3">Records</p>
        <h1 className="display mt-3 max-w-3xl text-[clamp(2.4rem,6vw,4.4rem)]">What the records show, and what they <span className="accent-word">leave out.</span></h1>
        <p className="mt-5 max-w-2xl text-lg text-fg-2">
          Road-cutting permissions, completions, resurfacing, planned shutdowns and incidents, checked against each other and against residents&apos; reports.
          Every figure on this page is counted from the database when you load it.
        </p>
        <p className="mt-4 text-sm text-fg-3">
          Coverage: Greater Chennai. {imported && <>Last import {dayMonth(new Date(imported))}. </>}
          {demo > 0 && <><span className="tag tag-demo align-middle">Demo data</span> {demo} of {demo + real} items are synthetic demonstration records.</>}
        </p>
      </BlurFade>

      <div className="mt-10 grid gap-6 md:grid-cols-4">
        {[
          ["Permissions recorded", permits.length],
          ["Completion matched by reference", matchedByRef],
          ["Findings to check", findings.length],
          ["Live resident reports", clusters.filter((c) => c.status === "open").length],
        ].map(([label, n], i) => (
          <BlurFade key={String(label)} inView delay={i * 0.05}>
            <Sheet label={String(label)} bodyClassName="px-5 py-4">
              <NumberTicker value={Number(n)} className="text-5xl font-semibold tracking-[-0.05em]" />
            </Sheet>
          </BlurFade>
        ))}
      </div>

      <BlurFade inView className="mt-6">
        <Sheet label="Records by type" bodyClassName="space-y-2 p-5">
          {byKind.map(([k, n]) => (
            <div key={k} className="grid grid-cols-[12rem_1fr_2rem] items-center gap-3 text-sm">
              <span className="text-fg-2">{NOTICE_KINDS[k].label}</span>
              <span className="h-2.5 rounded-[2px] bg-surface-2"><span className="block h-full rounded-[2px]" style={{ width: `${(n / maxKind) * 100}%`, background: NOTICE_KINDS[k].color }} /></span>
              <span className="text-right font-mono">{n}</span>
            </div>
          ))}
        </Sheet>
      </BlurFade>

      <div className="mt-14"><RecordsExplorer findings={findings} notices={notices} /></div>
    </main>
  );
}
