import type { Outlook } from "@/lib/outlook";
import { dayWord, hhmm, istParts, span } from "@/lib/time";

// 48 hourly cells per row. Solid = recorded or forecast disruption, faint = possible.
export function OutlookGrid({ outlook }: { outlook: Outlook }) {
  const { hours, rows, items } = outlook;
  return (
    <div>
      <div className="overflow-x-auto pb-2" data-lenis-prevent>
        <div className="min-w-[640px]">
          <div className="ml-28 flex text-[10px] text-fg-3">
            {hours.map((h, i) => {
              const hr = istParts(h).h;
              return (
                <div key={i} className="relative flex-1">
                  {(i === 0 || hr === 0) && <span className="label absolute -top-1 left-0 whitespace-nowrap text-fg-2">{dayWord(h)}</span>}
                  {hr % 6 === 0 && <span className="absolute top-3.5 left-0 font-mono">{String(hr).padStart(2, "0")}</span>}
                </div>
              );
            })}
          </div>
          <div className="mt-8 space-y-1.5">
            {rows.map((r) => (
              <div key={r.key} className="flex items-center">
                <span className="w-28 shrink-0 pr-3 text-sm text-fg-2">{r.label}</span>
                <div className="flex flex-1 gap-[2px]">
                  {r.cells.map((lv, i) => (
                    <span key={i} title={`${dayWord(hours[i])} ${hhmm(hours[i])}`}
                      className={`h-7 flex-1 rounded-[2px] ${istParts(hours[i]).h === 0 ? "ml-1" : ""}`}
                      style={{ background: lv === 0 ? "var(--surface-2)" : r.color, opacity: lv === 2 ? 0.95 : lv === 1 ? 0.4 : 0.55 }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {!outlook.rainAvailable && <p className="mt-2 text-xs text-fg-3">Rain forecast unavailable right now; waterlogging row is empty.</p>}

      <ol className="mt-6 divide-y divide-line border-y border-line">
        {items.length === 0 && <li className="py-4 text-fg-3">Nothing recorded or forecast for the next 48 hours within 500 m.</li>}
        {items.map((it, i) => (
          <li key={i} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
            <span className="w-52 shrink-0 font-mono text-[12px] text-fg-2">{span(it.when[0], it.when[1])}</span>
            <span className="min-w-0 flex-1">
              <span className="font-medium">{it.what}</span>
              <span className="text-fg-3">, {it.who}</span>
            </span>
            {it.demo ? <span className="tag tag-demo">Demo data</span>
              : it.source ? <a href={it.source} className="tag tag-news" target="_blank" rel="noreferrer">Source</a>
              : <span className="tag tag-community">Resident reports</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
