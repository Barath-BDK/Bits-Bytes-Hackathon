import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ViewTransition } from "react";
import { notFound } from "next/navigation";
import { getCluster, getFindings } from "@/lib/data";
import { KINDS, clusterTitle, complaintDraft, formatDate, isOverdue, photoSrc, priorityParts, shortId, timeAgo } from "@/lib/issues";
import { VouchButton } from "@/components/vouch-button";
import { KindBadge } from "@/components/kind-icon";
import { BlurFade } from "@/components/motion-bits";
import { BackLink } from "@/components/back-link";
import { ConfirmButtons } from "@/components/confirm-buttons";
import { Sheet } from "@/components/sheet";
import { PriorityLedger } from "@/components/vignettes";
import { WhoAnswers } from "@/components/who-answers";
import { FindingCard } from "@/components/finding-card";
import { departments, ladder, locate } from "@/lib/jurisdiction";
import { streetHref } from "@/lib/links";
import { SITE } from "@/lib/site";
import { daysSince } from "@/lib/time";

export const revalidate = 60;
// Records are pre-rendered on first visit, then served from the edge until a write invalidates them.
export async function generateStaticParams() { return []; }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: PageProps<"/c/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Record TH-${id.slice(0, 8).toUpperCase()}` };
}

export default async function ClusterPage({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [d, findings] = await Promise.all([getCluster(id), getFindings()]);
  if (!d) notFound();

  const c = d.cluster;
  const k = KINDS[c.kind];
  const parts = priorityParts(c);
  const photos = d.reports.filter((r) => r.photo);
  // Fixed origin: never build links from the request's Host header.
  const draft = complaintDraft(d, `${SITE.url}/c/${c.id}`);
  const j = locate(c.lat, c.lng);
  const daysOpen = daysSince(c.first_reported_at);
  // findings about this record, or within 150 m of it
  const near = findings.filter((f) => JSON.stringify(f.refs).includes(c.id) ||
    Math.hypot((f.lat - c.lat) * 111_000, (f.lng - c.lng) * 111_000 * Math.cos((c.lat * Math.PI) / 180)) < 150);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-8 sm:px-6">
      <BackLink href={`/map?c=${c.id}`}>Back to the map</BackLink>

      <header className="mt-8 grid gap-8 border-b border-line pb-10 lg:grid-cols-[1fr_auto]">
        <BlurFade>
          <div className="flex flex-wrap items-center gap-2">
            <KindBadge kind={c.kind} size={30} />
            <span className="label text-fg-2">{k.label}</span>
            <span className={`label rounded-full border px-2.5 py-1 ${c.status === "resolved" ? "border-ok text-ok" : "border-line text-fg-2"}`}>
              {c.status === "resolved" ? "Confirmed fixed" : "Open"}
            </span>
            <span className="label text-fg-3">TH-{shortId(c.id)}</span>
          </div>
          <h1 className="display mt-6 max-w-3xl text-[clamp(2.2rem,5.5vw,4.4rem)]">
            {c.kind === "worksite"
              ? `${c.department ?? "Unnamed agency"} is digging here.`
              : c.kind === "request"
                ? `${clusterTitle(c)}: ${c.reporter_count} ${c.reporter_count === 1 ? "person is" : "people are"} asking.`
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
          {c.kind !== "worksite" && c.status === "open" && (
            <BlurFade inView>
              <Sheet label={c.kind === "request" ? "Support this request" : "Seen it too?"} bodyClassName="p-6">
                {c.kind === "request" && <RequestTrack raised={c.reporter_count - (d.confirmations.vouch ?? 0)} vouches={d.confirmations.vouch ?? 0} resolved={false} />}
                <p className="mb-4 mt-1 text-sm text-fg-2">
                  {c.kind === "request"
                    ? "Each vouch counts as one more resident asking, and raises its priority. One per person; nothing about you is stored."
                    : "Add your weight without filing a new report. One per person; nothing about you is stored."}
                </p>
                <VouchButton id={c.id} initial={d.confirmations.vouch ?? 0} label={c.kind === "request" ? "I need this too" : "I see this too"} />
              </Sheet>
            </BlurFade>
          )}
          {c.kind !== "worksite" && (
            <BlurFade inView>
              <Sheet label="Neighbour check" bodyClassName="p-6">
                {c.kind === "request" && c.status === "resolved" && <RequestTrack raised={c.reporter_count - (d.confirmations.vouch ?? 0)} vouches={d.confirmations.vouch ?? 0} resolved />}
                <h2 className="text-xl font-semibold tracking-[-0.03em]">
                  {c.kind === "outage" ? "Is the power back?" : c.kind === "request" ? "Has it been done?" : c.kind === "parking" ? "Is the spot clear now?" : "Is it fixed?"}
                </h2>
                <p className="mt-1 text-sm text-fg-2">It closes only when two neighbours confirm, and they outnumber those who say otherwise.</p>
                <ConfirmButtons id={c.id} initial={d.confirmations} status={c.status}
                  labels={c.kind === "outage" ? ["Power is back", "Still off"] : c.kind === "request" ? ["Done", "Still waiting"] : c.kind === "parking" ? ["Cleared", "Still blocked"] : ["Fixed", "Still there"]} />
              </Sheet>
            </BlurFade>
          )}
          {near.length > 0 && (
            <BlurFade inView>
              <Sheet label="What the records show" bodyClassName="space-y-6 p-5">
                {near.map((f) => <FindingCard key={f.id} f={f} />)}
              </Sheet>
            </BlurFade>
          )}
          <BlurFade inView delay={0.08}>
            <Sheet label="Who answers for this" bodyClassName="p-5">
              <WhoAnswers j={j} contacts={departments(c.kind, c.category)} message={draft} subject={`${clusterTitle(c)}, ${c.reporter_count} residents, ref. TH-${shortId(c.id)}`}
                ladder={c.status === "open" ? ladder(c.kind, j) : undefined} daysOpen={daysOpen} />
            </Sheet>
          </BlurFade>
          <Link href={streetHref({ lat: c.lat, lng: c.lng, name: `${k.label} on this street` })} className="block text-sm underline decoration-line underline-offset-4 hover:decoration-fg">
            See the whole street record
          </Link>
          <p className="font-mono text-xs text-fg-3">{c.lat.toFixed(5)}, {c.lng.toFixed(5)}</p>
        </aside>
      </div>
    </main>
  );
}

// Where a request stands: raised, supported, resolved. Resolution is confirmed by residents, not claimed for an agency.
function RequestTrack({ raised, vouches, resolved }: { raised: number; vouches: number; resolved: boolean }) {
  const steps = [
    { label: "Raised", detail: `${raised} ${raised === 1 ? "resident" : "residents"}`, on: true },
    { label: "Supported", detail: `${vouches} ${vouches === 1 ? "vouch" : "vouches"}`, on: vouches > 0 },
    { label: "Resolved", detail: resolved ? "confirmed by neighbours" : "waiting", on: resolved },
  ];
  return (
    <ol className="mb-5 grid grid-cols-3 gap-2">
      {steps.map((s, i) => (
        <li key={s.label} className="relative">
          <span className={`block h-1.5 rounded-full ${s.on ? "bg-request" : "bg-surface-2"}`} style={{ opacity: s.on ? 1 - i * 0.12 : 1 }} />
          <span className={`mt-2 block text-sm font-medium ${s.on ? "text-fg" : "text-fg-3"}`}>{s.label}</span>
          <span className="block text-xs text-fg-3">{s.detail}</span>
        </li>
      ))}
    </ol>
  );
}
