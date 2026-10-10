"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export type Place = { name: string; area: string; kind: string; lat: number; lng: number };

export function PlaceSearch({ onPick }: { onPick: (p: Place) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const picked = useRef(false); // skip the lookup triggered by filling in the chosen name

  // Debounced lookup through our /api/geocode proxy.
  useEffect(() => {
    const term = q.trim();
    if (picked.current) { picked.current = false; return; }
    if (term.length < 2) return;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(term)}`, { signal: ctl.signal });
        if (res.ok) { setResults(await res.json()); setActive(0); setOpen(true); }
      } catch { /* aborted or offline */ } finally { setLoading(false); }
    }, 280);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);

  // "/" focuses search, like most command bars.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") { e.preventDefault(); input.current?.focus(); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  function pick(p: Place) {
    picked.current = true;
    onPick(p);
    setQ(p.name);
    setOpen(false);
    input.current?.blur();
  }

  const shown = open && q.trim().length >= 2;

  return (
    <div className="relative min-w-0 flex-1 md:max-w-md">
      <div className="panel flex h-11 items-center gap-2.5 rounded-xl px-3.5 shadow-lg transition focus-within:!border-accent focus-within:ring-4 focus-within:ring-[color:var(--glow)]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-fg-3">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!shown || !results.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % results.length); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + results.length) % results.length); }
            if (e.key === "Enter") { e.preventDefault(); pick(results[active]); }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search a street, area or landmark" aria-label="Search for a place" role="combobox" aria-expanded={shown} aria-controls="place-results"
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-fg-3 focus-visible:outline-none sm:text-sm" />
        {loading ? <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-fg-3 border-t-transparent" />
          : <kbd className="label hidden shrink-0 rounded-md border border-line px-1.5 py-0.5 text-[10px] text-fg-3 sm:block">/</kbd>}
      </div>
      <AnimatePresence>
        {shown && (
          <motion.ul id="place-results" role="listbox"
            initial={{ opacity: 0, y: -6, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="panel absolute inset-x-0 top-[3.25rem] overflow-hidden rounded-xl p-1.5 shadow-2xl">
            {results.length === 0 && <li className="px-3 py-2.5 text-sm text-fg-3">No places found.</li>}
            {results.map((r, i) => (
              <li key={`${r.lat},${r.lng},${i}`} role="option" aria-selected={i === active}>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => pick(r)} onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${i === active ? "bg-surface-2" : ""}`}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-fg-3">
                    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" />
                  </svg>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.name}</span>
                    {r.area && <span className="block truncate text-xs text-fg-3">{r.area}</span>}
                  </span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
