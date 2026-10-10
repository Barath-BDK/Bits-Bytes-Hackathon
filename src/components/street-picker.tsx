"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
      <p className="label mt-4 text-fg-2">{recent.length ? "Recent searches" : "Popular streets"}</p>
      {/* one swipeable row on phones, wrapping on wider screens */}
      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
        {showing.map((e) => (
          <button key={e.name} onClick={() => go(e)}
            className="max-w-[16rem] shrink-0 truncate rounded-[6px] border border-line bg-bg/60 px-3 py-1.5 text-sm text-fg transition hover:border-accent hover:text-accent focus-visible:border-accent">
            {e.name}{!recent.length && <span className="text-fg-2">, {e.area}</span>}
          </button>
        ))}
        {recent.length > 0 && <button onClick={clear} className="label self-center px-1 text-fg-3 transition hover:text-fg">Clear</button>}
      </div>
    </div>
  );
}
