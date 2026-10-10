"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { PlaceSearch, type Place } from "@/components/place-search";
import { streetHref } from "@/lib/links";

type Spot = { name: string; area: string; lat: number; lng: number };
const KEY = "th-recent-streets";
const load = (): Spot[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };

// Search, then this browser's recent searches (kept only on this device), or a few suggestions until there are any.
export function StreetPicker({ examples }: { examples: Spot[] }) {
  const router = useRouter();
  const [recent, setRecent] = useState<Spot[]>([]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only storage, read after hydration
  useEffect(() => { setRecent(load()); }, []);

  function go(s: Spot) {
    const next = [s, ...load().filter((r) => r.name !== s.name)].slice(0, 5);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ }
    router.push(streetHref(s));
  }
  function clear() {
    try { localStorage.removeItem(KEY); } catch { /* private mode */ }
    setRecent([]);
  }

  const showing = recent.length ? recent : examples;
  return (
    <div>
      <div className="max-w-xl"><PlaceSearch onPick={(p: Place) => go({ name: p.name, area: p.area, lat: p.lat, lng: p.lng })} /></div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="label mr-1 flex items-center gap-1.5 text-fg-3">
          {recent.length > 0 && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          )}
          {recent.length ? "Recent searches" : "Popular streets"}
        </span>
        <AnimatePresence initial={false} mode="popLayout">
          {showing.map((e, i) => (
            <motion.button key={e.name} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }} exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => go(e)}
              className="chip group inline-flex max-w-[16rem] items-center gap-2 rounded-full border border-line bg-surface/60 py-1.5 pl-2.5 pr-3.5 text-sm text-fg-2 transition hover:-translate-y-0.5 hover:border-fg-3 hover:text-fg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-accent transition group-hover:scale-110" aria-hidden>
                <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" />
              </svg>
              <span className="truncate">{e.name}</span>
            </motion.button>
          ))}
        </AnimatePresence>
        {recent.length > 0 && <button onClick={clear} className="label ml-1 text-fg-3 transition hover:text-fg">Clear</button>}
      </div>
    </div>
  );
}
