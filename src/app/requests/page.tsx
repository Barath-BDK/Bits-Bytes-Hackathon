import type { Metadata } from "next";
import Link from "next/link";
import { getClusters } from "@/lib/data";
import { locate } from "@/lib/jurisdiction";
import { BlurFade } from "@/components/motion-bits";
import { RequestsBoard } from "@/components/requests-board";
import { StatRow } from "@/components/stat-row";

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
        <p className="label text-fg-3">Community requests</p>
        <div className="grid-cols-1 mt-3 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="display max-w-3xl text-[clamp(2.4rem,6vw,4.4rem)]">Ask once. Let the street <span className="accent-word">back you.</span></h1>
            <p className="mt-5 max-w-2xl text-lg text-fg-2">
              Streetlights, garbage, drains, trees, stray animals, water. Every request here is public: neighbours vouch instead of filing
              the same complaint again, the most backed rise to the top, and a request closes only when two of them confirm it was done.
              No account, and no phone number handed to anyone.
            </p>
          </div>
          <Link href="/map?report=request" className="inline-flex items-center justify-center rounded-[8px] bg-fg px-5 py-3 font-medium text-bg transition hover:opacity-85">
            Raise a request
          </Link>
        </div>
      </BlurFade>

      <BlurFade delay={0.1}>
        <StatRow className="mt-10" stats={[["Open requests", open.length], ["Residents backing them", backers], ["Confirmed done", done]]} />
      </BlurFade>

      <div className="mt-10"><RequestsBoard rows={rows} /></div>
    </main>
  );
}
