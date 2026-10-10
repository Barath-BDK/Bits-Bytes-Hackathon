import { NumberTicker } from "@/components/motion-bits";

// Figures in one quiet row: a label above each number, thin dividers between them.
export function StatRow({ stats, className = "" }: { stats: [string, number][]; className?: string }) {
  const cols = stats.length === 4 ? "grid-cols-2 sm:grid-cols-4" : stats.length === 2 ? "grid-cols-2" : "grid-cols-3";
  return (
    <dl className={`grid ${cols} border-y border-line ${className}`}>
      {stats.map(([label, n], i) => (
        <div key={label} className={`min-w-0 px-3 py-4 sm:px-5 ${i % (stats.length === 4 ? 2 : stats.length) ? "border-l border-line" : ""} ${stats.length === 4 && i > 0 ? "sm:border-l" : ""} ${stats.length === 4 && i > 1 ? "border-t border-line sm:border-t-0" : ""}`}>
          <dt className="truncate text-xs text-fg-2 sm:text-sm">{label}</dt>
          <dd className="mt-1"><NumberTicker value={n} className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl" /></dd>
        </div>
      ))}
    </dl>
  );
}
