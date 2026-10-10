"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { REQUEST_CATEGORIES, timeAgo, type Cluster, type RequestCategory } from "@/lib/issues";
import { KindBadge } from "@/components/kind-icon";
import { VouchButton } from "@/components/vouch-button";

type Row = Cluster & { zone: string };
type Sort = "support" | "recent";

// The public board of community requests: what is being asked for, how many back it, and whether it was done.
export function RequestsBoard({ rows }: { rows: Row[] }) {
  const [cat, setCat] = useState<RequestCategory | "all">("all");
  const [status, setStatus] = useState<"open" | "resolved">("open");
  const [sort, setSort] = useState<Sort>("support");

  const list = useMemo(() => rows
    .filter((r) => (cat === "all" || r.category === cat) && r.status === status)
    .sort((a, b) => sort === "support" ? b.reporter_count - a.reporter_count || b.last_reported_at.localeCompare(a.last_reported_at)
      : b.last_reported_at.localeCompare(a.last_reported_at)), [rows, cat, status, sort]);

  const cats = (Object.keys(REQUEST_CATEGORIES) as RequestCategory[]).filter((c) => rows.some((r) => r.category === c));
  const max = Math.max(1, ...rows.map((r) => r.reporter_count));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {(["all", ...cats] as const).map((c) => (
          <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition ${cat === c ? "border-request bg-request text-[#06201b]" : "border-line text-fg-2 hover:border-fg-3 hover:text-fg"}`}>
            {c === "all" ? "Everything" : REQUEST_CATEGORIES[c].short}
            <span className="ml-1.5 tabular-nums opacity-60">{c === "all" ? rows.length : rows.filter((r) => r.category === c).length}</span>
          </button>
        ))}
        <span className="ml-auto flex gap-1 rounded-lg bg-surface-2 p-1 text-sm">
          {([["open", "Open"], ["resolved", "Done"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setStatus(v)} aria-pressed={status === v}
              className={`rounded-md px-3 py-1 transition ${status === v ? "bg-bg text-fg shadow" : "text-fg-3 hover:text-fg"}`}>{l}</button>
          ))}
        </span>
        <span className="flex gap-1 rounded-lg bg-surface-2 p-1 text-sm">
          {([["support", "Most backed"], ["recent", "Newest"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setSort(v)} aria-pressed={sort === v}
              className={`rounded-md px-3 py-1 transition ${sort === v ? "bg-bg text-fg shadow" : "text-fg-3 hover:text-fg"}`}>{l}</button>
          ))}
        </span>
      </div>

      <motion.ul layout className="mt-6 grid gap-3 md:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {list.map((r) => (
            <motion.li key={r.id} layout initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="lift group relative overflow-hidden rounded-[10px] border border-line bg-surface/80 p-5">
              {/* support meter along the top edge: share of the most-backed request */}
              <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-surface-2">
                <span className="block h-full bg-request transition-[width] duration-700" style={{ width: `${(r.reporter_count / max) * 100}%` }} />
              </span>
              <div className="flex items-start gap-3">
                <KindBadge kind="request" size={36} />
                <div className="min-w-0 flex-1">
                  <Link href={`/c/${r.id}`} className="block text-lg font-semibold leading-snug tracking-[-0.02em] underline-offset-4 hover:underline">
                    {REQUEST_CATEGORIES[r.category ?? "other"].label}
                  </Link>
                  <p className="mt-0.5 text-sm text-fg-3">{r.zone}, raised {timeAgo(r.first_reported_at)}</p>
                </div>
                {r.demo && <span className="tag tag-demo shrink-0">Demo</span>}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <p className="text-sm">
                  <span className="text-2xl font-semibold tabular-nums tracking-[-0.04em]">{r.reporter_count}</span>
                  <span className="ml-1.5 text-fg-2">{r.reporter_count === 1 ? "resident asking" : "residents asking"}</span>
                </p>
                <span className={`tag ${r.status === "resolved" ? "tag-official" : "tag-gap"}`}>{r.status === "resolved" ? "Done, confirmed by neighbours" : "Waiting"}</span>
                <span className="ml-auto">{r.status === "open" && <VouchButton id={r.id} initial={r.vouches} compact label="Vouch" />}</span>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
      {list.length === 0 && <p className="mt-8 text-fg-3">{status === "open" ? "No open requests here yet." : "None marked done yet."}</p>}
    </div>
  );
}
