"use client";

import { ViewTransition, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { KINDS, photoSrc, timeAgo, type Cluster, type Kind } from "@/lib/issues";
import { KindBadge, kindIconSvg } from "@/components/kind-icon";
import { NumberTicker, listContainer, listItem } from "@/components/motion-bits";
import { ReportSheet, type Submitted } from "@/components/report-sheet";
import { PlaceSearch, type Place } from "@/components/place-search";

maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs"); // self-hosted: bundlers cannot resolve the worker

const STYLE = { dark: "https://tiles.openfreemap.org/styles/dark", light: "https://tiles.openfreemap.org/styles/positron" };
const CHENNAI: [number, number] = [80.215, 13.02];
const EASE = [0.2, 0.8, 0.2, 1] as const;
type Filter = "all" | Kind;

const pinColor = (k: Kind) => (k === "pothole" ? "var(--pothole)" : k === "waterlogging" ? "var(--water)" : "var(--works)");
const pinSize = (c: Cluster) => 26 + Math.min(c.reporter_count, 6) * 2;

function currentMode() {
  return document.documentElement.dataset.mode === "light" ? "light" : "dark";
}

export function MapView({ clusters, startReporting, focusId }: { clusters: Cluster[]; startReporting: boolean; focusId: string | null }) {
  const router = useRouter();
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new Map<string, HTMLDivElement>());
  const draftMarker = useRef<maplibregl.Marker | null>(null);
  const placeMarker = useRef<maplibregl.Marker | null>(null);

  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string | null>(focusId);
  const [reporting, setReporting] = useState(startReporting);
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [sidebar, setSidebar] = useState(true);
  const reportingRef = useRef(reporting);
  useEffect(() => { reportingRef.current = reporting; }, [reporting]);

  const visible = useMemo(() => clusters.filter((c) => filter === "all" || c.kind === filter), [clusters, filter]);
  const sel = clusters.find((c) => c.id === selected) ?? null;
  const stats = useMemo(() => {
    const open = clusters.filter((c) => c.status === "open");
    return { open: open.length, reporters: open.reduce((n, c) => n + c.reporter_count, 0), linked: open.filter((c) => c.near_worksite).length };
  }, [clusters]);

  // Create the map once; follow the site's light/dark mode.
  useEffect(() => {
    if (!mapEl.current) return;
    const m = new maplibregl.Map({ container: mapEl.current, style: STYLE[currentMode()], center: CHENNAI, zoom: 11, attributionControl: { compact: true } });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    m.on("click", (e) => { if (reportingRef.current) setDraft({ lat: e.lngLat.lat, lng: e.lngLat.lng }); });
    const open = clusters.filter((c) => c.status === "open");
    if (open.length > 1 && !focusId) {
      const b = new maplibregl.LngLatBounds();
      open.forEach((c) => b.extend([c.lng, c.lat]));
      m.fitBounds(b, { padding: 70, maxZoom: 13, duration: 0 });
    }
    const obs = new MutationObserver(() => m.setStyle(STYLE[currentMode()]));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode"] });
    map.current = m;
    return () => { obs.disconnect(); m.remove(); };
    // clusters/focusId only matter for the first framing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Markers: rebuilt per filter change. The root element is positioned by MapLibre; we style an inner pin.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const built: maplibregl.Marker[] = [];
    const els = markers.current;
    for (const c of visible) {
      const root = document.createElement("div");
      root.className = "gw-marker";
      root.style.zIndex = String(c.status === "resolved" ? 0 : c.priority); // urgent issues sit on top of overlaps
      root.setAttribute("role", "button");
      root.setAttribute("tabindex", "0");
      root.setAttribute("aria-label", `${KINDS[c.kind].label}, ${c.reporter_count} reporters`);
      const pin = document.createElement("div");
      const s = pinSize(c);
      pin.className = `gw-pin${c.status === "open" && c.priority >= 100 ? " gw-pulse" : ""}`;
      pin.setAttribute("data-kind", c.kind);
      pin.setAttribute("data-status", c.status);
      Object.assign(pin.style, { width: `${s}px`, height: `${s}px`, background: pinColor(c.kind) });
      pin.innerHTML = kindIconSvg(c.kind, Math.round(s * 0.56)) + (c.reporter_count > 1 ? `<span class="gw-count">${c.reporter_count}</span>` : "");
      root.appendChild(pin);
      const pick = (ev: Event) => { ev.stopPropagation(); setSelected(c.id); };
      root.addEventListener("click", pick);
      root.addEventListener("keydown", (ev) => { if ((ev as KeyboardEvent).key === "Enter") pick(ev); });
      els.set(c.id, pin);
      built.push(new maplibregl.Marker({ element: root, anchor: "center" }).setLngLat([c.lng, c.lat]).addTo(m));
    }
    return () => { built.forEach((mk) => mk.remove()); els.clear(); };
  }, [visible]);

  useEffect(() => {
    for (const [id, pin] of markers.current) pin.setAttribute("data-active", String(id === selected));
  }, [selected, visible]);

  useEffect(() => {
    if (sel && map.current) map.current.flyTo({ center: [sel.lng, sel.lat], zoom: Math.max(map.current.getZoom(), 15), duration: 1100, essential: true });
  }, [sel]);

  // Draft pin for a new report (draggable).
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    draftMarker.current?.remove();
    draftMarker.current = null;
    if (!reporting || !draft) return;
    const root = document.createElement("div");
    root.className = "gw-marker";
    root.innerHTML = `<div class="gw-pin gw-pulse" style="width:30px;height:30px;background:var(--fg);color:var(--bg)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>`;
    const mk = new maplibregl.Marker({ element: root, draggable: true }).setLngLat([draft.lng, draft.lat]).addTo(m);
    mk.on("dragend", () => { const p = mk.getLngLat(); setDraft({ lat: p.lat, lng: p.lng }); });
    draftMarker.current = mk;
    // keep the pin clear of the form panel on wide screens
    m.easeTo({ center: [draft.lng, draft.lat], zoom: Math.max(m.getZoom(), 16), duration: 700, padding: { left: innerWidth >= 640 ? 420 : 0, top: 0, right: 0, bottom: innerWidth < 640 ? 320 : 0 } });
  }, [reporting, draft]);

  // Searched place marker.
  useEffect(() => {
    const m = map.current;
    placeMarker.current?.remove();
    placeMarker.current = null;
    if (!m || !place) return;
    const root = document.createElement("div");
    root.innerHTML = `<div style="width:14px;height:14px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 6px color-mix(in oklab,var(--accent) 25%,transparent),0 0 0 1.5px var(--bg)"></div>`;
    placeMarker.current = new maplibregl.Marker({ element: root }).setLngLat([place.lng, place.lat]).addTo(m);
    m.flyTo({ center: [place.lng, place.lat], zoom: 15.5, duration: 1300, essential: true });
  }, [place]);

  function startReport(at?: { lat: number; lng: number }) {
    setSelected(null);
    setReporting(true);
    if (at) setDraft(at);
  }

  function onSubmitted(r: Submitted) {
    setReporting(false);
    setDraft(null);
    setPlace(null);
    setSelected(r.cluster_id);
    router.refresh();
  }

  return (
    <div className="relative h-[calc(100dvh-3.5rem)] overflow-hidden">
      <div className="absolute inset-0"><div ref={mapEl} className="h-full w-full" /></div>

      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebar && !reporting && (
          <motion.aside key="sidebar" data-lenis-prevent
            initial={{ x: -420, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -420, opacity: 0 }} transition={{ duration: 0.45, ease: EASE }}
            className="panel absolute bottom-3 left-3 top-3 z-20 hidden w-[360px] flex-col overflow-hidden rounded-2xl shadow-2xl md:flex">
            <div className="border-b border-line px-4 pb-3 pt-4">
              <div className="flex items-center justify-between">
                <p className="label text-fg-3">Chennai live ledger</p>
                <button onClick={() => setSidebar(false)} aria-label="Collapse sidebar" className="grid h-7 w-7 place-items-center rounded-lg text-fg-3 transition hover:bg-surface-2 hover:text-fg">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Stat n={stats.open} label="Open" />
                <Stat n={stats.reporters} label="Reporters" />
                <Stat n={stats.linked} label="Near works" accent />
              </div>
              <div className="relative mt-3 flex gap-1 rounded-xl bg-surface-2 p-1" role="group" aria-label="Filter by type">
                {(["all", "pothole", "waterlogging", "worksite"] as Filter[]).map((f) => (
                  <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
                    className={`relative z-10 flex-1 rounded-lg py-1.5 text-xs font-medium transition ${filter === f ? "text-fg" : "text-fg-3 hover:text-fg-2"}`}>
                    {filter === f && <motion.span layoutId="filter-pill" className="absolute inset-0 -z-10 rounded-lg bg-bg shadow" transition={{ type: "spring", stiffness: 480, damping: 36 }} />}
                    {f === "all" ? "All" : f === "waterlogging" ? "Water" : KINDS[f].plural}
                  </button>
                ))}
              </div>
            </div>
            <motion.ol key={filter} variants={listContainer} initial="hidden" animate="show" className="flex-1 overflow-y-auto p-2">
              {visible.map((c, i) => (
                <motion.li key={c.id} variants={listItem}>
                  <button onClick={() => setSelected(c.id)}
                    className={`group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition ${c.id === selected ? "bg-surface-2" : "hover:bg-surface-2/60"}`}>
                    <KindBadge kind={c.kind} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[15px] font-medium tracking-[-0.01em]">{KINDS[c.kind].severity[c.severity_max - 1]} {KINDS[c.kind].label.toLowerCase()}</span>
                        <span className={`label shrink-0 ${c.status === "resolved" ? "text-ok" : "text-fg-3"}`}>{c.status === "resolved" ? "Fixed" : `#${i + 1}`}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-fg-3">
                        {c.kind === "worksite" ? c.department : `${c.reporter_count} ${c.reporter_count === 1 ? "report" : "reports"}, ${timeAgo(c.last_reported_at)}`}
                      </span>
                      {c.near_worksite && c.status === "open" && (
                        <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-works/15 px-1.5 py-0.5 text-[11px] font-medium text-works">
                          <span className="stripes h-2 w-3 rounded-sm" /> Beside an active dig
                        </span>
                      )}
                    </span>
                  </button>
                </motion.li>
              ))}
              {visible.length === 0 && <li className="p-6 text-sm text-fg-3">Nothing reported here yet.</li>}
            </motion.ol>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Top bar: expand sidebar, search, report */}
      <motion.div layout transition={{ duration: 0.45, ease: EASE }}
        className={`absolute top-3 z-30 flex items-center gap-2 ${reporting ? "left-3 right-3 sm:left-[414px]" : sidebar ? "left-3 right-3 md:left-[384px]" : "left-3 right-3"}`}>
        {!sidebar && !reporting && (
          <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} onClick={() => setSidebar(true)} aria-label="Show list"
            className="panel hidden h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium md:flex">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
            {stats.open} open
          </motion.button>
        )}
        <PlaceSearch onPick={setPlace} />
        {!reporting && (
          <button onClick={() => startReport()} className="h-11 shrink-0 rounded-xl bg-fg px-4 text-sm font-medium text-bg shadow-lg transition hover:opacity-85">
            Report
          </button>
        )}
      </motion.div>

      {/* Searched place: offer to report there */}
      <AnimatePresence>
        {place && !reporting && !sel && (
          <motion.div initial={{ opacity: 0, y: 16, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="panel absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-2xl py-2 pl-4 pr-2 shadow-2xl">
            <span className="max-w-[46vw] truncate text-sm"><span className="font-medium">{place.name}</span> <span className="text-fg-3">{place.area}</span></span>
            <button onClick={() => startReport({ lat: place.lat, lng: place.lng })} className="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-accent-fg">Report here</button>
            <button onClick={() => setPlace(null)} aria-label="Clear search" className="grid h-8 w-8 place-items-center rounded-lg text-fg-3 hover:bg-surface-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected issue preview */}
      <AnimatePresence mode="wait">
        {sel && !reporting && (
          <motion.div key={sel.id}
            initial={{ opacity: 0, y: 24, scale: 0.98, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 16, scale: 0.98, filter: "blur(6px)" }} transition={{ duration: 0.4, ease: EASE }}
            className="panel absolute bottom-4 right-4 z-20 w-[min(360px,calc(100%-2rem))] overflow-hidden rounded-2xl shadow-2xl">
            {photoSrc(sel.cover_photo) && (
              <ViewTransition name={`photo-${sel.id}`} share="morph" default="none">
                <div className="relative h-40 w-full bg-surface-2">
                  <Image src={photoSrc(sel.cover_photo)!} alt="" fill sizes="360px" className="object-cover" />
                </div>
              </ViewTransition>
            )}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><KindBadge kind={sel.kind} size={24} /><span className="label text-fg-2">{KINDS[sel.kind].label}</span></span>
                <button onClick={() => setSelected(null)} className="grid h-7 w-7 place-items-center rounded-lg text-fg-3 hover:bg-surface-2 hover:text-fg" aria-label="Close">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
              </div>
              <p className="mt-2 text-xl font-semibold leading-tight tracking-[-0.03em]">
                {sel.kind === "worksite" ? sel.department : `${sel.reporter_count} ${sel.reporter_count === 1 ? "person has" : "people have"} reported this`}
              </p>
              <p className="mt-1 text-sm text-fg-3">
                {KINDS[sel.kind].severity[sel.severity_max - 1]}, first seen {timeAgo(sel.first_reported_at)}{sel.status === "resolved" ? ", confirmed fixed" : ""}
              </p>
              <Link href={`/c/${sel.id}`} className="mt-4 flex items-center justify-between rounded-xl bg-surface-2 px-3.5 py-2.5 text-sm font-medium transition hover:bg-fg hover:text-bg">
                Open the full record
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reporting && (
          <ReportSheet key="sheet" point={draft} onPoint={setDraft} onCancel={() => { setReporting(false); setDraft(null); }} onSubmitted={onSubmitted} />
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ n, label, accent }: { n: number; label: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border border-line px-2.5 py-2 ${accent ? "bg-works/12" : "bg-surface-2/60"}`}>
      <NumberTicker value={n} className="text-2xl font-semibold tracking-[-0.04em]" />
      <div className="label mt-0.5 text-[10px] text-fg-3">{label}</div>
    </div>
  );
}
