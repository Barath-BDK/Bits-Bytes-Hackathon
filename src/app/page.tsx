"use client";

import { useEffect, useState } from "react";

type Health = { api: string; db: string; time?: string; postgis?: string };

export default function Home() {
  const [health, setHealth] = useState<Health | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setFailed(true));
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 font-mono">
      <h1 className="text-4xl font-semibold tracking-tight">Gullywatch</h1>
      <p className="text-sm opacity-70">frontend → api → database</p>
      <pre className="rounded border border-current/20 p-4 text-sm" aria-live="polite">
        {failed ? "api unreachable" : health ? JSON.stringify(health, null, 2) : "checking…"}
      </pre>
    </main>
  );
}
