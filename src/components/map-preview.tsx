"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Map as MlMap } from "maplibre-gl";
import { KINDS, type Kind } from "@/lib/issues";

type Pin = { lat: number; lng: number; kind: Kind; n: number };
const STYLE = { dark: "https://tiles.openfreemap.org/styles/dark", light: "https://tiles.openfreemap.org/styles/positron" };

// A small, still view of the live map with every open report on it, so the map's value is visible before anyone
// opens it. MapLibre loads only when this scrolls into view; the preview is not interactive and links to the full map.
export function MapPreview({ pins, works }: { pins: Pin[]; works: { lat: number; lng: number; r: number }[] }) {
  const box = useRef<HTMLDivElement>(null);
  const el = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = box.current;
    if (!host) return;
    let map: MlMap | null = null;
    let cancelled = false;
    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting || map) return;
      io.disconnect();
      const ml = await import("maplibre-gl");
      await import("maplibre-gl/dist/maplibre-gl.css");
      if (cancelled || !el.current) return;
      ml.setWorkerUrl("/maplibre-gl-worker.mjs");
      const mode = document.documentElement.dataset.mode === "light" ? "light" : "dark";
      map = new ml.Map({ container: el.current, style: STYLE[mode], center: [80.235, 13.0], zoom: 10.9, interactive: false, attributionControl: { compact: true } });
      map.on("load", () => {
        if (!map) return;
        const css = getComputedStyle(document.documentElement);
        const color = (k: Kind) => css.getPropertyValue(KINDS[k].color.slice(4, -1)).trim() || "#999";
        map.addSource("works", { type: "geojson", data: { type: "FeatureCollection", features: works.map((w) => ({ type: "Feature", properties: { r: w.r }, geometry: { type: "Point", coordinates: [w.lng, w.lat] } })) } });
        map.addLayer({ id: "works", type: "circle", source: "works", paint: { "circle-radius": 5, "circle-color": color("worksite"), "circle-opacity": 0.22 } });
        map.addSource("pins", { type: "geojson", data: { type: "FeatureCollection", features: pins.map((p) => ({ type: "Feature", properties: { c: color(p.kind), n: p.n }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })) } });
        map.addLayer({ id: "halo", type: "circle", source: "pins", paint: { "circle-radius": ["+", 9, ["*", 1.5, ["get", "n"]]], "circle-color": ["get", "c"], "circle-opacity": 0.18 } });
        map.addLayer({ id: "pins", type: "circle", source: "pins", paint: { "circle-radius": 5.5, "circle-color": ["get", "c"], "circle-stroke-width": 1.5, "circle-stroke-color": css.getPropertyValue("--bg").trim() || "#000" } });
        setReady(true);
      });
    }, { rootMargin: "200px" });
    io.observe(host);
    return () => { cancelled = true; io.disconnect(); map?.remove(); };
  }, [pins, works]);

  return (
    <div ref={box} className="relative h-[340px] overflow-hidden rounded-[6px] border border-line bg-surface-2 sm:h-[400px]">
      <div ref={el} className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`} aria-hidden />
      {!ready && <div className="skeleton absolute inset-0 !rounded-none" />}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,color-mix(in_oklab,var(--bg)_85%,transparent))]" />
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4">
        <p className="text-sm text-fg-2"><span className="font-semibold text-fg">{pins.length}</span> open reports and <span className="font-semibold text-fg">{works.length}</span> stretches of works on the map</p>
        <Link href="/map" className="rounded-[8px] bg-fg px-4 py-2 text-sm font-medium text-bg transition hover:opacity-85">Open the live map</Link>
      </div>
    </div>
  );
}
