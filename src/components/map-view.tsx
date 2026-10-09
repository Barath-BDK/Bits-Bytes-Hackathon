"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { KINDS, photoSrc, timeAgo, type Cluster, type Kind } from "@/lib/issues";
import { ReportSheet, type Submitted } from "@/components/report-sheet";

maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs"); // self-hosted: bundlers cannot resolve the worker

const CHENNAI: [number, number] = [80.215, 13.02];
type Filter = "all" | Kind;

function pinSize(c: Cluster) {
  return 14 + Math.min(c.reporter_count, 8) * 3;
}

export function MapView({ clusters, startReporting, focusId }: { clusters: Cluster[]; startReporting: boolean; focusId: string | null }) {
  const router = useRouter();
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new Map<string, { marker: maplibregl.Marker; el: HTMLDivElement }>());
  const draftMarker = useRef<maplibregl.Marker | null>(null);

  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string | null>(focusId);
  const [reporting, setReporting] = useState(startReporting);
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const reportingRef = useRef(reporting);
  useEffect(() => { reportingRef.current = reporting; }, [reporting]);

  const visible = useMemo(() => clusters.filter((c) => filter === "all" || c.kind === filter), [clusters, filter]);
  const sel = clusters.find((c) => c.id === selected) ?? null;
  const stats = useMemo(() => {
    const open = clusters.filter((c) => c.status === "open");
    return { open: open.length, reporters: open.reduce((n, c) => n + c.reporter_count, 0), linked: open.filter((c) => c.near_worksite).length };
  }, [clusters]);

  // Create the map once.
  useEffect(() => {
    if (!mapEl.current) return;
    const m = new maplibregl.Map({
      container: mapEl.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: CHENNAI,
      zoom: 11.2,
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    m.on("click", (e) => {
      if (reportingRef.current) setDraft({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });
    map.current = m;
    return () => m.remove();
  }, []);

  // Rebuild DOM markers for the filtered clusters (at most a few hundred, so rebuilding is cheap).
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const built = markers.current;
    for (const c of visible) {
      const el = document.createElement("div");
      const s = pinSize(c);
      el.className = `pin${c.status === "open" && c.priority >= 100 ? " pin-pulse" : ""}`;
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `${KINDS[c.kind].label}, ${c.reporter_count} reporters`);
      el.setAttribute("data-kind", c.kind);
      el.setAttribute("data-status", c.status);
      Object.assign(el.style, { width: `${s}px`, height: `${s}px`, background: KINDS[c.kind].color, color: KINDS[c.kind].color, position: "relative" });
      el.addEventListener("click", (ev) => { ev.stopPropagation(); setSelected(c.id); });
      built.set(c.id, { el, marker: new maplibregl.Marker({ element: el }).setLngLat([c.lng, c.lat]).addTo(m) });
    }
    return () => {
      for (const { marker } of built.values()) marker.remove();
      built.clear();
    };
  }, [visible]);

  useEffect(() => {
    for (const [id, { el }] of markers.current) el.setAttribute("data-active", String(id === selected));
  }, [selected, visible]);

  useEffect(() => {
    if (sel && map.current) map.current.easeTo({ center: [sel.lng, sel.lat], zoom: Math.max(map.current.getZoom(), 14), duration: 700 });
  }, [sel]);

  // Draft pin for a new report.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    draftMarker.current?.remove();
    draftMarker.current = null;
    if (reporting && draft) {
      const el = document.createElement("div");
      el.className = "pin pin-pulse";
      Object.assign(el.style, { width: "22px", height: "22px", background: "var(--ink)", color: "var(--ink)", position: "relative" });
      draftMarker.current = new maplibregl.Marker({ element: el, draggable: true }).setLngLat([draft.lng, draft.lat]).addTo(m);
      draftMarker.current.on("dragend", () => {
        const p = draftMarker.current!.getLngLat();
        setDraft({ lat: p.lat, lng: p.lng });
      });
      m.easeTo({ center: [draft.lng, draft.lat], zoom: Math.max(m.getZoom(), 15), duration: 600 });
    }
  }, [reporting, draft]);

  function onSubmitted(r: Submitted) {
    setReporting(false);
    setDraft(null);
    setSelected(r.cluster_id);
    router.refresh();
  }

  return (
    <div className="relative grid h-[calc(100dvh-3.5rem)] grid-rows-[1fr_auto] lg:grid-cols-[400px_1fr] lg:grid-rows-1">
      <aside className="order-2 flex max-h-[42dvh] flex-col border-t border-rule bg-paper lg:order-1 lg:max-h-none lg:border-r lg:border-t-0" data-lenis-prevent>
        <div className="border-b border-rule px-4 py-3">
          <p className="kicker text-ink-3">Chennai · live ledger</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <Stat n={stats.open} label="open issues" />
            <Stat n={stats.reporters} label="reporters" />
            <Stat n={stats.linked} label="near works" accent />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
            {(["all", "pothole", "waterlogging", "worksite"] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
                className={`kicker rounded-full border px-2.5 py-1 transition ${filter === f ? "border-ink bg-ink text-paper" : "border-rule hover:border-ink-3"}`}>
                {f === "all" ? "All" : KINDS[f].plural}
              </button>
            ))}
          </div>
        </div>
        <ol className="flex-1 overflow-y-auto">
          {visible.map((c, i) => (
            <li key={c.id}>
              <button onClick={() => setSelected(c.id)}
                className={`flex w-full items-start gap-3 border-b border-rule px-4 py-3 text-left transition hover:bg-paper-2 ${c.id === selected ? "bg-paper-2" : ""}`}>
                <span className="kicker w-6 pt-1 text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: KINDS[c.kind].color }} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">{KINDS[c.kind].label} · {KINDS[c.kind].severity[c.severity_max - 1]}</span>
                    <span className={`kicker ${c.status === "resolved" ? "text-resolved" : ""}`}>{c.status === "resolved" ? "Fixed" : `P${c.priority}`}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-2">
                    {c.department ?? `${c.reporter_count} reporter${c.reporter_count === 1 ? "" : "s"}`} · {timeAgo(c.last_reported_at)}
                  </span>
                  {c.near_worksite && c.status === "open" && (
                    <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium">
                      <span className="stripes h-2.5 w-4 rounded-sm" /> Next to an active work site
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
          {visible.length === 0 && <li className="p-6 text-sm text-ink-3">Nothing reported here yet.</li>}
        </ol>
      </aside>

      <section className="relative order-1 lg:order-2">
        {/* maplibre's CSS forces position:relative on its container, so size it from a wrapper */}
        <div className="absolute inset-0"><div ref={mapEl} className="h-full w-full" /></div>

        {!reporting && (
          <button onClick={() => { setReporting(true); setSelected(null); }}
            className="absolute left-4 top-4 z-10 rounded-full bg-ink px-5 py-2.5 font-medium text-paper shadow-[var(--shadow)] hover:opacity-90">
            + Report an issue
          </button>
        )}

        {sel && !reporting && (
          <div className="rise absolute bottom-4 left-4 right-4 z-10 max-w-sm overflow-hidden rounded-2xl border border-rule bg-paper shadow-[var(--shadow)] sm:right-auto">
            {photoSrc(sel.cover_photo) && (
              <div className="relative h-36 w-full bg-paper-3">
                <Image src={photoSrc(sel.cover_photo)!} alt="" fill sizes="384px" className="object-cover" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <span className="kicker" style={{ color: KINDS[sel.kind].color }}>{KINDS[sel.kind].label}</span>
                <button onClick={() => setSelected(null)} className="kicker text-ink-3 hover:text-ink" aria-label="Close">Close ✕</button>
              </div>
              <p className="mt-1 font-display text-2xl leading-tight">
                {sel.kind === "worksite" ? sel.department : `${sel.reporter_count} ${sel.reporter_count === 1 ? "person has" : "people have"} reported this`}
              </p>
              <p className="mt-1 text-sm text-ink-2">
                {KINDS[sel.kind].severity[sel.severity_max - 1]} · first seen {timeAgo(sel.first_reported_at)}
                {sel.status === "resolved" && " · confirmed fixed"}
              </p>
              <Link href={`/c/${sel.id}`} className="mt-3 inline-flex items-center gap-2 text-sm font-medium underline decoration-2 underline-offset-4">
                Open the ledger entry →
              </Link>
            </div>
          </div>
        )}

        {reporting && (
          <ReportSheet point={draft} onPoint={setDraft} onCancel={() => { setReporting(false); setDraft(null); }} onSubmitted={onSubmitted} />
        )}
      </section>
    </div>
  );
}

function Stat({ n, label, accent }: { n: number; label: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border border-rule px-2 py-1.5 ${accent ? "bg-works/25" : "bg-paper-2"}`}>
      <div className="font-display text-2xl leading-none">{n}</div>
      <div className="kicker mt-1 text-[0.55rem] text-ink-2">{label}</div>
    </div>
  );
}
