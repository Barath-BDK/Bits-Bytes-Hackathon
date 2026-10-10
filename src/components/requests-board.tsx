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
        <span className="flex gap-1 overflow-x-auto rounded-lg bg-surface-2 p-1 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(["all", ...cats] as const).map((c) => (
            <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}
              className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1 transition ${cat === c ? "bg-bg text-fg shadow" : "text-fg-3 hover:text-fg"}`}>
              {c === "all" ? "Everything" : REQUEST_CATEGORIES[c].short}
              <span className="ml-1.5 tabular-nums opacity-60">{c === "all" ? rows.length : rows.filter((r) => r.category === c).length}</span>
            </button>
          ))}
        </span>
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

      <div className="sheet mt-6">
        <div className="flex items-center justify-between border-b border-line px-5 py-3 text-sm">
          <h3 className="font-semibold">{status === "open" ? "Open requests" : "Done"}</h3><span className="tabular-nums text-fg-2">{list.length}</span>
        </div>
        <motion.ol layout>
          <AnimatePresence mode="popLayout" initial={false}>
            {list.map((r) => (
              <motion.li key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-4 last:border-0">
                <KindBadge kind="request" size={32} />
                <div className="min-w-0 flex-1">
                  <Link href={`/c/${r.id}`} className="block truncate font-medium tracking-[-0.01em] underline-offset-4 hover:underline">
                    {REQUEST_CATEGORIES[r.category ?? "other"].label}
                  </Link>
                  <p className="text-sm text-fg-3">{r.zone}, raised {timeAgo(r.first_reported_at)}</p>
                </div>
                <div className="w-28 shrink-0">
                  <p className="text-sm"><span className="font-semibold tabular-nums">{r.reporter_count}</span> <span className="text-fg-3">asking</span></p>
                  <span className="mt-1 block h-1.5 rounded-[2px] bg-surface-2"><span className="block h-full rounded-[2px] bg-request" style={{ width: `${(r.reporter_count / max) * 100}%` }} /></span>
                </div>
                {r.demo && <span className="tag tag-demo shrink-0">Demo</span>}
                {r.status === "open" ? <VouchButton id={r.id} initial={r.vouches} compact label="Vouch" /> : <span className="tag tag-official shrink-0">Done</span>}
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ol>
        {list.length === 0 && <p className="px-5 py-6 text-fg-3">{status === "open" ? "No open requests here yet." : "None marked done yet."}</p>}
      </div>
    </div>
  );
}
