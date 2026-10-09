"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

type Counts = { fixed: number; still_there: number };

function Count({ n }: { n: number }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span key={n} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="inline-block tabular-nums">{n}</motion.span>
    </AnimatePresence>
  );
}

export function ConfirmButtons({ id, initial, status, labels = ["Fixed", "Still there"] }: { id: string; initial: Counts; status: "open" | "resolved"; labels?: [string, string] }) {
  const router = useRouter();
  const [counts, setCounts] = useState(initial);
  const [state, setState] = useState(status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function vote(verdict: "fixed" | "still_there") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/clusters/${id}/confirm`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ verdict }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(body.error ?? "Could not record your answer");
    setCounts({ fixed: body.fixed, still_there: body.still_there });
    setState(body.status);
    router.refresh();
  }

  return (
    <div className="mt-5">
      <div className="grid grid-cols-2 gap-2">
        <motion.button whileTap={{ scale: 0.96 }} disabled={busy} onClick={() => vote("fixed")}
          className="flex items-center justify-center gap-2 rounded-xl border border-ok/60 bg-ok/10 py-2.5 font-medium text-ok transition hover:bg-ok hover:text-bg disabled:opacity-50">
          {labels[0]} <Count n={counts.fixed} />
        </motion.button>
        <motion.button whileTap={{ scale: 0.96 }} disabled={busy} onClick={() => vote("still_there")}
          className="flex items-center justify-center gap-2 rounded-xl border border-line py-2.5 font-medium transition hover:bg-fg hover:text-bg disabled:opacity-50">
          {labels[1]} <Count n={counts.still_there} />
        </motion.button>
      </div>
      <p className="mt-3 text-sm text-fg-3" role="status">{state === "resolved" ? `Status: confirmed (${labels[0].toLowerCase()})` : "Status: open"}</p>
      {error && <p className="mt-2 text-sm text-alert" role="alert">{error}</p>}
    </div>
  );
}
