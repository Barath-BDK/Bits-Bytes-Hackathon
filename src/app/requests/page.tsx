import type { Metadata } from "next";
import Link from "next/link";
import { getClusters } from "@/lib/data";
import { locate } from "@/lib/jurisdiction";
import { BlurFade, NumberTicker } from "@/components/motion-bits";
import { RequestsBoard } from "@/components/requests-board";

export const metadata: Metadata = { title: "Requests" };
export const revalidate = 60;

export default async function RequestsPage() {
  const clusters = await getClusters();
  const rows = clusters.filter((c) => c.kind === "request").map((c) => {
    const j = locate(c.lat, c.lng);
    return { ...c, zone: j.zone ? `Zone ${j.zone.no}, ${j.zone.name}` : "Outside GCC limits" };
  });
  const open = rows.filter((r) => r.status === "open");
  const backers = open.reduce((n, r) => n + r.reporter_count, 0);
  const done = rows.filter((r) => r.status === "resolved").length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-14 sm:px-6">
      <BlurFade>
        <p className="label text-request">Community requests</p>
        <div className="mt-3 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="display max-w-3xl text-[clamp(2.4rem,6vw,4.4rem)]">Ask once. Let the street <span className="accent-word">back you.</span></h1>
            <p className="mt-5 max-w-2xl text-lg text-fg-2">
              Streetlights, garbage, drains, trees, stray animals, water. Every request here is public: neighbours vouch instead of filing
              the same complaint again, the most backed rise to the top, and a request closes only when two of them confirm it was done.
              No account, and no phone number handed to anyone.
            </p>
          </div>
          <Link href="/map?report=request" className="inline-flex items-center justify-center rounded-[10px] bg-request px-5 py-3 font-medium text-[#06201b] transition hover:brightness-110">
            Raise a request
          </Link>
        </div>
      </BlurFade>

      <BlurFade delay={0.1}>
        <div className="mt-10 grid grid-cols-3 overflow-hidden rounded-[10px] border border-line">
          {[[open.length, "Open requests"], [backers, "Residents backing them"], [done, "Done, confirmed"]].map(([n, label], i) => (
            <div key={String(label)} className={`bg-surface/70 p-5 ${i ? "border-l border-line" : ""}`}>
              <NumberTicker value={Number(n)} className="text-4xl font-semibold tracking-[-0.05em]" />
              <p className="label mt-1 text-fg-3">{label}</p>
            </div>
          ))}
        </div>
      </BlurFade>

      <div className="mt-10"><RequestsBoard rows={rows} /></div>
    </main>
  );
}
