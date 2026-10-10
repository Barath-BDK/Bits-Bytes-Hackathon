"use client";

import { ViewTransition, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { KINDS, NOTICE_KINDS, clusterTitle, isLiveOutage, photoSrc, timeAgo, type Cluster, type Kind, type Notice } from "@/lib/issues";
import { addOverlays, setNight } from "@/lib/map-layers";
import { KindBadge, kindIconSvg } from "@/components/kind-icon";
import { IssuePanel, applyFilters, type KindFilter, type SortBy, type StatusFilter } from "@/components/issue-list";
import { ReportSheet, type Submitted } from "@/components/report-sheet";
import { PlaceSearch, type Place } from "@/components/place-search";

maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs"); // self-hosted: bundlers cannot resolve the worker

const STYLE = { dark: "https://tiles.openfreemap.org/styles/dark", light: "https://tiles.openfreemap.org/styles/positron" };
const CHENNAI: [number, number] = [80.215, 13.02];
const EASE = [0.2, 0.8, 0.2, 1] as const;

const pinColor = (k: Kind) => KINDS[k].color;
const pinSize = (c: Cluster) => 26 + Math.min(c.reporter_count, 6) * 2;

function currentMode() {
  return document.documentElement.dataset.mode === "light" ? "light" : "dark";
}

export function MapView({ clusters: all, notices }: { clusters: Cluster[]; notices: Notice[] }) {
  // power-cut reports older than six hours are history, not live pins
  const clusters = useMemo(() => all.filter((c) => c.kind !== "outage" || c.status === "resolved" || isLiveOutage(c)), [all]);
  const liveOutages = clusters.filter(isLiveOutage).length;
  const router = useRouter();
  const params = useSearchParams();
  // ?report=1 opens the form; ?report=<kind> also picks the kind (e.g. ?report=request from the requests board)
  const reportParamRaw = params.get("report");
  const startReporting = !!reportParamRaw && reportParamRaw !== "0";
  const startKind = reportParamRaw && reportParamRaw in KINDS ? (reportParamRaw as Kind) : undefined;
  const focusId = params.get("c");
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new Map<string, HTMLDivElement>());
  const draftMarker = useRef<maplibregl.Marker | null>(null);
  const placeMarker = useRef<maplibregl.Marker | null>(null);

  const [kind, setKind] = useState<KindFilter>("all");
  const [sort, setSort] = useState<SortBy>("priority");
  const [status, setStatus] = useState<StatusFilter>("open");
  const [drawer, setDrawer] = useState(false);
  const [selected, setSelected] = useState<string | null>(focusId);
  const [reporting, setReporting] = useState(startReporting);
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [sidebar, setSidebar] = useState(true);
  // The header's Report link only changes ?report=1; open the form when that happens while already on the map.
  const [reportParam, setReportParam] = useState(startReporting);
  if (reportParam !== startReporting) {
    setReportParam(startReporting);
    if (startReporting) { setReporting(true); setSelected(null); }
  }
  const reportingRef = useRef(reporting);
  useEffect(() => { reportingRef.current = reporting; }, [reporting]);
  const [night, setNightView] = useState(false);
  const [legend, setLegend] = useState(false);
  const overlay = useRef({ notices, clusters, night });
  useEffect(() => {
    overlay.current = { notices, clusters, night };
    const m = map.current;
    if (m?.isStyleLoaded()) addOverlays(m, notices, clusters, night);
  }, [notices, clusters, night]);

  const visible = useMemo(() => applyFilters(clusters, kind, status, sort), [clusters, kind, status, sort]);
  const sel = clusters.find((c) => c.id === selected) ?? null;
  const openCount = useMemo(() => clusters.filter((c) => c.status === "open").length, [clusters]);

  // Create the map once; follow the site's light/dark mode.
  useEffect(() => {
    if (!mapEl.current) return;
    const m = new maplibregl.Map({ container: mapEl.current, style: STYLE[currentMode()], center: CHENNAI, zoom: 11, attributionControl: false });
    // controls sit top right under the search bar, clear of the dock and the preview card at the bottom
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.addControl(new maplibregl.AttributionControl({ compact: true }), "top-right");
    // compact attribution starts expanded; fold it to its "i" chip (credits stay one tap away)
    m.once("load", () => {
      const a = mapEl.current?.querySelector(".maplibregl-ctrl-attrib");
      a?.classList.remove("maplibregl-compact-show");
      a?.removeAttribute("open");
    });
    m.on("click", (e) => { if (reportingRef.current) setDraft({ lat: e.lngLat.lat, lng: e.lngLat.lng }); });
    // overlays are wiped by every style change (light/dark), so re-add them each time a style loads
    m.on("style.load", () => { const o = overlay.current; addOverlays(m, o.notices, o.clusters, o.night); });
    const open = clusters.filter((c) => c.status === "open");
    if (open.length > 4 && !focusId) { // with only a few pins, stay on the city rather than zooming out to fit them
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
      pin.className = `gw-pin${c.status === "open" && (c.priority >= 100 || isLiveOutage(c)) ? " gw-pulse" : ""}`;
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

  function pick(id: string) {
    setSelected(id);
    setDrawer(false);
  }

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
    <div className="fixed inset-0 overflow-hidden">
      {/* isolate: marker z-indexes stay inside the map layer and never cover panels */}
      <div className="absolute inset-0 isolate z-0"><div ref={mapEl} className="h-full w-full" /></div>

      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebar && !reporting && (
          <motion.aside key="sidebar" data-lenis-prevent
            initial={{ x: -420, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -420, opacity: 0 }} transition={{ duration: 0.45, ease: EASE }}
            className="panel absolute bottom-24 left-3 top-3 z-20 hidden w-[372px] flex-col overflow-hidden rounded-[6px] shadow-2xl md:flex">
            <div className="flex items-center justify-between px-4 pb-2 pt-3">
              <p className="label text-fg-3">Chennai live ledger</p>
              <button onClick={() => setSidebar(false)} aria-label="Collapse sidebar" className="grid h-7 w-7 place-items-center rounded-lg text-fg-3 transition hover:bg-surface-2 hover:text-fg">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>
              </button>
            </div>
            <IssuePanel idPrefix="side" all={clusters} visible={visible} selected={selected} onSelect={pick}
              kind={kind} setKind={setKind} sort={sort} setSort={setSort} status={status} setStatus={setStatus} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile: list in a bottom drawer */}
      {!reporting && !sel && !place && (
        <button onClick={() => setDrawer(true)} className="panel absolute bottom-[84px] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-2xl md:hidden">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
          {openCount} open issues, sort and filter
        </button>
      )}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div key="scrim" className="absolute inset-0 z-[55] bg-black/40 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.div key="drawer" className="panel absolute inset-x-0 bottom-0 z-[60] flex max-h-[78dvh] flex-col rounded-t-[14px] !bg-surface shadow-2xl md:hidden"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.4, ease: EASE }}
              drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} onDragEnd={(_, i) => { if (i.offset.y > 90) setDrawer(false); }}>
              <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-fg-3/50" />
              <div className="flex items-center justify-between px-4 pb-2 pt-2">
                <p className="label text-fg-3">Chennai live ledger</p>
                <button onClick={() => setDrawer(false)} className="label text-fg-3">Close</button>
              </div>
              <IssuePanel idPrefix="drawer" all={clusters} visible={visible} selected={selected} onSelect={pick}
                kind={kind} setKind={setKind} sort={sort} setSort={setSort} status={status} setStatus={setStatus} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top bar: expand sidebar, search, report */}
      <motion.div layout transition={{ duration: 0.45, ease: EASE }}
        className={`absolute top-3 z-30 flex items-center gap-2 ${reporting ? "left-3 right-3 sm:left-[414px]" : sidebar ? "left-3 right-3 md:left-[396px]" : "left-3 right-3"}`}>
        {!sidebar && !reporting && (
          <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} onClick={() => setSidebar(true)} aria-label="Show list"
            className="panel hidden h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium md:flex">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
            {openCount} open
          </motion.button>
        )}
        <PlaceSearch onPick={setPlace} />
        <button onClick={() => { setNightView((v) => !v); if (map.current) setNight(map.current, !night); }} aria-pressed={night}
          title="Night view: dims the city and blacks out areas where residents report no power"
          className={`panel flex h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium transition ${night ? "!border-outage text-outage" : ""}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" /></svg>
          <span className="hidden sm:inline">Night view</span>
          {liveOutages > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-outage px-1 font-mono text-[11px] text-white">{liveOutages}</span>}
        </button>
        <button onClick={() => setLegend((v) => !v)} aria-expanded={legend} aria-controls="map-legend" title="What the shapes on the map mean"
          className={`panel flex h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium transition ${legend ? "!border-fg-3" : ""}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></svg>
          <span className="hidden sm:inline">Key</span>
        </button>
      </motion.div>

      <AnimatePresence>
        {legend && (
          <motion.div id="map-legend" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease: EASE }}
            className="panel absolute right-3 top-[62px] z-30 w-[min(320px,calc(100%-1.5rem))] sm:right-[58px] rounded-[8px] p-4 text-sm shadow-2xl">
            <p className="label text-fg-3">Shaded circles: works and notices</p>
            <p className="mt-1 text-xs text-fg-3">The approximate area each record covers: construction mapped on OpenStreetMap, and published notices centred on the locality they name (shown while in force, upcoming, or ended in the last day).</p>
            <ul className="mt-3 space-y-1.5">
              {(["works", "power_shutdown", "water_suspension", "road_permit", "incident", "resurfacing"] as const).map((k) => (
                <li key={k} className="flex items-center gap-2.5">
                  <span className="legend-swatch" style={{ background: `color-mix(in oklab, ${NOTICE_KINDS[k].color} 30%, transparent)`, border: `1.5px solid ${NOTICE_KINDS[k].color}` }} />
                  {NOTICE_KINDS[k].label}
                </li>
              ))}
            </ul>
            <p className="label mt-4 text-fg-3">Rings and pins: resident reports</p>
            <ul className="mt-2 space-y-1.5">
              <li className="flex items-center gap-2.5"><span className="legend-swatch" style={{ border: "2.5px solid var(--outage)" }} />Power cut reported in the last 6 hours</li>
              <li className="flex items-center gap-2.5"><span className="legend-swatch !rounded-[4px]" style={{ background: "var(--pothole)" }} />A report; the number counts residents</li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Searched place: offer to report there */}
      <AnimatePresence>
        {place && !reporting && !sel && (
          <motion.div initial={{ opacity: 0, y: 16, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="panel absolute bottom-[84px] left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-2xl py-2 pl-4 pr-2 shadow-2xl md:bottom-24">
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
            className="panel absolute bottom-[84px] right-4 z-20 w-[min(360px,calc(100%-2rem))] md:bottom-24 overflow-hidden rounded-2xl shadow-2xl">
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
                {sel.kind === "request" ? KINDS.request.severity[sel.severity_max - 1] : clusterTitle(sel)}, first seen {timeAgo(sel.first_reported_at)}{sel.status === "resolved" ? ", confirmed fixed" : ""}
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
          <ReportSheet key="sheet" initialKind={startKind} point={draft} onPoint={setDraft} onCancel={() => { setReporting(false); setDraft(null); }} onSubmitted={onSubmitted} />
        )}
      </AnimatePresence>
    </div>
  );
}

