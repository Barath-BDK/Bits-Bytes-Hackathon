"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Counts = { fixed: number; still_there: number };

export function ConfirmButtons({ id, initial, status }: { id: string; initial: Counts; status: "open" | "resolved" }) {
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
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-2">
        <button disabled={busy} onClick={() => vote("fixed")} className="rounded-full border-2 border-resolved py-2 font-medium text-resolved hover:bg-resolved hover:text-paper disabled:opacity-50">
          Fixed · {counts.fixed}
        </button>
        <button disabled={busy} onClick={() => vote("still_there")} className="rounded-full border-2 border-ink py-2 font-medium hover:bg-ink hover:text-paper disabled:opacity-50">
          Still there · {counts.still_there}
        </button>
      </div>
      <p className="kicker mt-3 text-ink-3" role="status">{state === "resolved" ? "Status: confirmed fixed" : "Status: open"}</p>
      {error && <p className="mt-2 text-sm text-alert" role="alert">{error}</p>}
    </div>
  );
}
