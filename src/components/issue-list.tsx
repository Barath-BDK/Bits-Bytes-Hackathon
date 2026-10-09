"use client";

import { motion } from "motion/react";
import { KINDS, timeAgo, type Cluster, type Kind } from "@/lib/issues";
import { KindBadge } from "@/components/kind-icon";
import { NumberTicker, listContainer, listItem } from "@/components/motion-bits";

export type KindFilter = "all" | Kind;
export type SortBy = "priority" | "recent" | "reports";
export type StatusFilter = "open" | "resolved" | "all";

export function applyFilters(clusters: Cluster[], kind: KindFilter, status: StatusFilter, sort: SortBy) {
  const list = clusters.filter((c) => (kind === "all" || c.kind === kind) && (status === "all" || c.status === status));
  const by: Record<SortBy, (a: Cluster, b: Cluster) => number> = {
    priority: (a, b) => (a.status === b.status ? b.priority - a.priority : a.status === "open" ? -1 : 1),
    recent: (a, b) => b.last_reported_at.localeCompare(a.last_reported_at),
    reports: (a, b) => b.reporter_count - a.reporter_count || b.priority - a.priority,
  };
  return list.sort(by[sort]);
}

function Pills<T extends string>({ id, value, options, onPick }: { id: string; value: T; options: [T, string][]; onPick: (v: T) => void }) {
  return (
    <div className="relative flex gap-1 rounded-lg bg-surface-2 p-1" role="group">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onPick(v)} aria-pressed={value === v}
          className={`relative z-10 flex-1 whitespace-nowrap rounded-md px-1 py-1.5 text-[11px] font-medium transition ${value === v ? "text-fg" : "text-fg-3 hover:text-fg-2"}`}>
          {value === v && <motion.span layoutId={`pill-${id}`} className="absolute inset-0 -z-10 rounded-md bg-bg shadow" transition={{ type: "spring", stiffness: 480, damping: 36 }} />}
          {label}
        </button>
      ))}
    </div>
  );
}

type Props = {
  all: Cluster[]; visible: Cluster[]; selected: string | null; onSelect: (id: string) => void;
  kind: KindFilter; setKind: (k: KindFilter) => void; sort: SortBy; setSort: (s: SortBy) => void;
  status: StatusFilter; setStatus: (s: StatusFilter) => void; idPrefix: string;
};

export function IssuePanel({ all, visible, selected, onSelect, kind, setKind, sort, setSort, status, setStatus, idPrefix }: Props) {
  const open = all.filter((c) => c.status === "open");
  const count = (k: KindFilter) => all.filter((c) => (k === "all" || c.kind === k) && (status === "all" || c.status === status)).length;
  return (
    <>
      <div className="space-y-2.5 border-b border-line px-4 pb-3 pt-1">
        <div className="grid grid-cols-3 gap-2">
          <Stat n={open.length} label="Open" />
          <Stat n={open.reduce((n, c) => n + c.reporter_count, 0)} label="Reporters" />
          <Stat n={open.filter((c) => c.near_worksite).length} label="Near works" accent />
        </div>
        <Pills id={`${idPrefix}-kind`} value={kind} onPick={setKind} options={[
          ["all", `All ${count("all")}`], ["pothole", `Potholes ${count("pothole")}`], ["waterlogging", `Water ${count("waterlogging")}`], ["worksite", `Works ${count("worksite")}`], ["outage", `Power ${count("outage")}`],
        ]} />
        <div className="grid grid-cols-[1.4fr_1fr] gap-2">
          <Pills id={`${idPrefix}-sort`} value={sort} onPick={setSort} options={[["priority", "Priority"], ["recent", "Recent"], ["reports", "Most"]]} />
          <Pills id={`${idPrefix}-status`} value={status} onPick={setStatus} options={[["open", "Open"], ["resolved", "Fixed"], ["all", "All"]]} />
        </div>
      </div>
      <motion.ol key={`${kind}-${sort}-${status}`} variants={listContainer} initial="hidden" animate="show" className="flex-1 overflow-y-auto overscroll-contain p-2" data-lenis-prevent>
        {visible.map((c, i) => (
          <motion.li key={c.id} variants={listItem}>
            <button onClick={() => onSelect(c.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition ${c.id === selected ? "bg-surface-2" : "hover:bg-surface-2/60"}`}>
              <KindBadge kind={c.kind} size={34} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[15px] font-medium tracking-[-0.01em]">{KINDS[c.kind].severity[c.severity_max - 1]} {KINDS[c.kind].label.toLowerCase()}</span>
                  <span className={`label shrink-0 ${c.status === "resolved" ? "text-ok" : "text-fg-3"}`}>
                    {c.status === "resolved" ? "Fixed" : sort === "priority" ? `#${i + 1}` : `P${c.priority}`}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-fg-3">
                  {c.kind === "worksite" ? c.department : `${c.reporter_count} ${c.reporter_count === 1 ? "report" : "reports"}, ${timeAgo(c.last_reported_at)}`}
                </span>
                {c.near_worksite && c.status === "open" && (
                  <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-[3px] bg-works/15 px-1.5 py-0.5 text-[11px] font-medium text-works">
                    <span className="stripes h-2 w-3 rounded-sm" /> Beside an active dig
                  </span>
                )}
              </span>
            </button>
          </motion.li>
        ))}
        {visible.length === 0 && <li className="p-6 text-sm text-fg-3">Nothing here with these filters.</li>}
      </motion.ol>
    </>
  );
}

function Stat({ n, label, accent }: { n: number; label: string; accent?: boolean }) {
  return (
    <div className={`rounded-[4px] border border-line px-2.5 py-2 ${accent ? "bg-works/12" : "bg-surface-2/60"}`}>
      <NumberTicker value={n} className="text-2xl font-semibold tracking-[-0.04em]" />
      <div className="label mt-0.5 text-[10px] text-fg-3">{label}</div>
    </div>
  );
}
