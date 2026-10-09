import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ViewTransition } from "react";
import { notFound } from "next/navigation";
import { getCluster } from "@/lib/data";
import { KINDS, complaintDraft, formatDate, isOverdue, photoSrc, priorityParts, shortId, timeAgo } from "@/lib/issues";
import { KindBadge } from "@/components/kind-icon";
import { BlurFade } from "@/components/motion-bits";
import { ComplaintBox } from "@/components/complaint-box";
import { ConfirmButtons } from "@/components/confirm-buttons";
import { Sheet } from "@/components/sheet";
import { PriorityLedger } from "@/components/vignettes";

export const revalidate = 60;
// Records are pre-rendered on first visit, then served from the edge until a write invalidates them.
export async function generateStaticParams() { return []; }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: PageProps<"/c/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Record GW-${id.slice(0, 8).toUpperCase()}` };
}

export default async function ClusterPage({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const d = await getCluster(id);
  if (!d) notFound();

  const c = d.cluster;
  const k = KINDS[c.kind];
  const parts = priorityParts(c);
  const photos = d.reports.filter((r) => r.photo);
  // Fixed origin: never build links from the request's Host header.
  const draft = complaintDraft(d, `https://gullywatch.vercel.app/c/${c.id}`);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-8 sm:px-6">
      <Link href={`/map?c=${c.id}`} className="group inline-flex items-center gap-1.5 text-sm text-fg-3 transition hover:text-fg">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="transition-transform group-hover:-translate-x-0.5"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
        Back to the map
      </Link>

      <header className="mt-8 grid gap-8 border-b border-line pb-10 lg:grid-cols-[1fr_auto]">
        <BlurFade>
          <div className="flex flex-wrap items-center gap-2">
            <KindBadge kind={c.kind} size={30} />
            <span className="label text-fg-2">{k.label}</span>
            <span className={`label rounded-full border px-2.5 py-1 ${c.status === "resolved" ? "border-ok text-ok" : "border-line text-fg-2"}`}>
              {c.status === "resolved" ? "Confirmed fixed" : "Open"}
            </span>
            <span className="label text-fg-3">GW-{shortId(c.id)}</span>
          </div>
          <h1 className="display mt-6 max-w-3xl text-[clamp(2.2rem,5.5vw,4.4rem)]">
            {c.kind === "worksite"
              ? `${c.department ?? "Unnamed agency"} is digging here.`
              : `${c.reporter_count} ${c.reporter_count === 1 ? "person has" : "people have"} reported this ${k.label.toLowerCase()}.`}
          </h1>
          <p className="mt-5 text-lg text-fg-2">
            {k.severity[c.severity_max - 1]}. First reported {formatDate(c.first_reported_at)}, last report {timeAgo(c.last_reported_at)}.
          </p>
        </BlurFade>
        {c.kind !== "worksite" && (
          <BlurFade delay={0.15}>
            <Sheet label="Priority assessment" className="lg:w-80" bodyClassName="p-5">
              <PriorityLedger parts={parts} total={c.priority} />
            </Sheet>
          </BlurFade>
        )}
      </header>

      {d.nearby_works.length > 0 && c.status === "open" && (
        <BlurFade inView>
          <section className="mt-10 overflow-hidden rounded-2xl border border-works/50 bg-works/[0.07]">
            <div className="stripes h-1.5" />
            <div className="p-6">
              <p className="label text-works">Coordination flag</p>
              {d.nearby_works.map((w) => (
                <p key={w.id} className="mt-3 text-lg leading-relaxed">
                  <Link href={`/c/${w.id}`} className="font-semibold underline decoration-works decoration-2 underline-offset-4">{w.department ?? "A work site"}</Link>{" "}
                  is digging {w.distance_m} m away
                  {w.promised_end && <>, and promised to finish by <strong>{formatDate(w.promised_end)}</strong>{isOverdue(w.promised_end) && <span className="text-alert"> (overdue)</span>}</>}.
                  {" "}This damage may fall under their restoration duty, so it should not be paid for twice.
                </p>
              ))}
            </div>
          </section>
        </BlurFade>
      )}

      {c.kind === "worksite" && c.promised_end && (
        <section className={`mt-10 rounded-2xl border p-6 ${isOverdue(c.promised_end) ? "border-alert/60 bg-alert/[0.07]" : "border-line bg-surface"}`}>
          <p className="label text-fg-3">Promised completion</p>
          <p className="mt-1 text-3xl font-semibold tracking-[-0.04em]">{formatDate(c.promised_end)}{isOverdue(c.promised_end) && <span className="text-alert">, overdue</span>}</p>
        </section>
      )}

      <div className="mt-14 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">Evidence</h2>
          {photos.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-3">
              {photos.map((r, i) => {
                const fig = (
                  <figure className={`relative overflow-hidden rounded-2xl border border-line bg-surface-2 ${i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-[4/3]"}`}>
                    <Image src={photoSrc(r.photo)!} alt={`${k.label} photo reported ${formatDate(r.created_at)}`} fill sizes="(min-width:1024px) 640px, 100vw" className="object-cover" priority={i === 0} />
                    <figcaption className="label absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-white backdrop-blur">{formatDate(r.created_at)}</figcaption>
                  </figure>
                );
                return i === 0
                  ? <ViewTransition key={r.id} name={`photo-${c.id}`} share="morph" default="none"><div className="col-span-2">{fig}</div></ViewTransition>
                  : <BlurFade key={r.id} inView delay={i * 0.05}>{fig}</BlurFade>;
              })}
            </div>
          ) : (
            <p className="mt-3 text-fg-3">No photos yet.</p>
          )}

          <h2 className="mt-14 text-2xl font-semibold tracking-[-0.03em]">Report history</h2>
          <ol className="relative mt-6 space-y-5 border-l border-line pl-6">
            {d.reports.map((r, i) => (
              <BlurFade key={r.id} inView delay={i * 0.04}>
                <li className="relative">
                  <span className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-[4px] border border-fg-3 bg-bg" />
                  <p className="text-sm text-fg-3">{formatDate(r.created_at)}, {k.severity[r.severity - 1].toLowerCase()}</p>
                  {r.note && <p className="mt-1">{r.note}</p>}
                </li>
              </BlurFade>
            ))}
          </ol>
        </section>

        <aside className="space-y-8">
          {c.kind !== "worksite" && (
            <BlurFade inView>
              <Sheet label="Neighbour check" bodyClassName="p-6">
                <h2 className="text-xl font-semibold tracking-[-0.03em]">Is it fixed?</h2>
                <p className="mt-1 text-sm text-fg-2">It closes only when two neighbours confirm, and more say fixed than not.</p>
                <ConfirmButtons id={c.id} initial={d.confirmations} status={c.status} />
              </Sheet>
            </BlurFade>
          )}
          <BlurFade inView delay={0.08}>
            <section>
              <h2 className="text-xl font-semibold tracking-[-0.03em]">Complaint, ready to send</h2>
              <p className="mt-1 text-sm text-fg-2">Filled in from this record. Paste it into the GCC grievance portal or an email.</p>
              <ComplaintBox text={draft} />
            </section>
          </BlurFade>
          <p className="font-mono text-xs text-fg-3">{c.lat.toFixed(5)}, {c.lng.toFixed(5)}</p>
        </aside>
      </div>
    </main>
  );
}
