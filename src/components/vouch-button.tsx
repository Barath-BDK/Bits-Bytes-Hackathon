"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

const KEY = "th-vouched";
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };

// "I need this too": adds one supporter per person (the server dedupes by a salted hash of the network address;
// the browser only remembers it to show the pressed state).
export function VouchButton({ id, initial, label = "I need this too", compact = false }: { id: string; initial: number; label?: string; compact?: boolean }) {
  const router = useRouter();
  const [count, setCount] = useState(initial);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only storage after hydration
  useEffect(() => { setDone(read().includes(id)); }, [id]);

  async function vouch() {
    if (done) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/clusters/${id}/vouch`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "Could not record that");
    setCount(body.vouches ?? count + 1);
    setDone(true);
    try { localStorage.setItem(KEY, JSON.stringify([...new Set([...read(), id])].slice(-200))); } catch { /* private mode */ }
    router.refresh();
  }

  return (
    <div>
      <motion.button whileTap={{ scale: 0.95 }} onClick={vouch} disabled={busy || done} aria-pressed={done}
        className={`group relative inline-flex items-center gap-2 overflow-hidden rounded-[10px] border font-medium transition disabled:cursor-default ${compact ? "px-3 py-1.5 text-sm" : "w-full justify-center px-4 py-3"} ${done ? "border-request/60 bg-request/15 text-request" : "border-request/50 bg-request text-[#06201b] hover:brightness-110"}`}>
        {!done && <span aria-hidden className="shine pointer-events-none absolute inset-0" />}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {done ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <><path d="M7 11v8H4v-8z" /><path d="M7 11l4-7a2 2 0 0 1 3 2l-1 4h5.5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.3 20H7" /></>}
        </svg>
        {done ? "You vouched" : label}
        <span className={`rounded-full px-1.5 text-xs tabular-nums ${done ? "bg-request/20" : "bg-black/15"}`}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={count} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} className="inline-block">{count}</motion.span>
          </AnimatePresence>
        </span>
      </motion.button>
      {error && <p className="mt-2 text-sm text-alert" role="alert">{error}</p>}
    </div>
  );
}
