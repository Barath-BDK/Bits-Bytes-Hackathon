import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getCluster } from "@/lib/data";
import { KINDS, complaintDraft, formatDate, isOverdue, photoSrc, priorityParts, shortId, timeAgo } from "@/lib/issues";
import { ComplaintBox } from "@/components/complaint-box";
import { ConfirmButtons } from "@/components/confirm-buttons";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: PageProps<"/c/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Ledger entry GW-${id.slice(0, 8).toUpperCase()}` };
}

export default async function ClusterPage({ params }: PageProps<"/c/[id]">) {
  await connection();
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
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6">
      <Link href={`/map?c=${c.id}`} className="kicker text-ink-3 hover:text-ink">← Back to the map</Link>

      <header className="rise mt-6 grid gap-6 border-b border-rule pb-8 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="kicker rounded-full px-2.5 py-1 text-paper" style={{ background: k.color, color: c.kind === "worksite" ? "#18160f" : undefined }}>{k.label}</span>
            <span className={`kicker rounded-full border px-2.5 py-1 ${c.status === "resolved" ? "border-resolved text-resolved" : "border-rule"}`}>
              {c.status === "resolved" ? "Confirmed fixed" : "Open"}
            </span>
            <span className="kicker text-ink-3">GW-{shortId(c.id)}</span>
          </div>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.05] sm:text-6xl">
            {c.kind === "worksite"
              ? `${c.department ?? "Unnamed agency"} is digging here.`
              : `${c.reporter_count} ${c.reporter_count === 1 ? "person has" : "people have"} reported this ${k.label.toLowerCase()}.`}
          </h1>
          <p className="mt-4 text-lg text-ink-2">
            {k.severity[c.severity_max - 1]} · first reported {formatDate(c.first_reported_at)} · last report {timeAgo(c.last_reported_at)}
          </p>
        </div>
        {c.kind !== "worksite" && (
          <div className="rounded-2xl border border-rule bg-paper-2 p-5 lg:w-72">
            <p className="kicker text-ink-3">Priority score</p>
            <p className="font-display text-6xl leading-none">{c.priority}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {parts.map((p) => (
                <li key={p.label} className="flex justify-between gap-3 border-t border-rule pt-1">
                  <span className="text-ink-2">{p.label}</span><span className="kicker">+{p.points}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      {d.nearby_works.length > 0 && c.status === "open" && (
        <section className="mt-8 overflow-hidden rounded-2xl border border-ink">
          <div className="stripes h-2" />
          <div className="p-5">
            <p className="kicker">Coordination flag</p>
            {d.nearby_works.map((w) => (
              <p key={w.id} className="mt-2 text-lg">
                <Link href={`/c/${w.id}`} className="font-medium underline decoration-works decoration-4 underline-offset-4">{w.department ?? "A work site"}</Link>{" "}
                is digging {w.distance_m} m away
                {w.promised_end && <>, promised to finish by <strong>{formatDate(w.promised_end)}</strong>{isOverdue(w.promised_end) && <span className="text-alert"> (overdue)</span>}</>}.
                {" "}This damage may fall under their restoration duty, so it should not be paid for twice.
              </p>
            ))}
          </div>
        </section>
      )}

      {c.kind === "worksite" && c.promised_end && (
        <section className={`mt-8 rounded-2xl border p-5 ${isOverdue(c.promised_end) ? "border-alert bg-alert/5" : "border-rule bg-paper-2"}`}>
          <p className="kicker">Promised completion</p>
          <p className="mt-1 font-display text-3xl">{formatDate(c.promised_end)}{isOverdue(c.promised_end) && <span className="text-alert"> · overdue</span>}</p>
        </section>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="font-display text-3xl">Evidence</h2>
          {photos.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {photos.map((r, i) => (
                <figure key={r.id} className={`relative overflow-hidden rounded-xl bg-paper-3 ${i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-[4/3]"}`}>
                  <Image src={photoSrc(r.photo)!} alt={`${k.label} photo reported ${formatDate(r.created_at)}`} fill sizes="(min-width:1024px) 640px, 100vw" className="object-cover" />
                  <figcaption className="kicker absolute bottom-2 left-2 rounded bg-paper/90 px-2 py-1">{formatDate(r.created_at)}</figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-ink-3">No photos yet.</p>
          )}

          <h2 className="mt-10 font-display text-3xl">Report history</h2>
          <ol className="mt-4 border-l-2 border-ink pl-5">
            {d.reports.map((r) => (
              <li key={r.id} className="relative pb-5">
                <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-paper" style={{ background: k.color }} />
                <p className="kicker text-ink-3">{formatDate(r.created_at)} · {k.severity[r.severity - 1]}</p>
                {r.note && <p className="mt-1">{r.note}</p>}
              </li>
            ))}
          </ol>
        </section>

        <aside className="space-y-8">
          {c.kind !== "worksite" && (
            <section className="rounded-2xl border border-rule bg-paper-2 p-5">
              <h2 className="font-display text-2xl">Is it fixed?</h2>
              <p className="mt-1 text-sm text-ink-2">It closes only when two neighbours confirm, and more say fixed than not.</p>
              <ConfirmButtons id={c.id} initial={d.confirmations} status={c.status} />
            </section>
          )}
          <section>
            <h2 className="font-display text-2xl">Complaint, ready to send</h2>
            <p className="mt-1 text-sm text-ink-2">Filled in from this record. Copy it into the GCC grievance portal or an email.</p>
            <ComplaintBox text={draft} />
          </section>
          <p className="kicker text-ink-3">{c.lat.toFixed(5)}, {c.lng.toFixed(5)}</p>
        </aside>
      </div>
    </main>
  );
}
