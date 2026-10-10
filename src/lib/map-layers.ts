// GeoJSON layers drawn under the pins: recorded notices as areas, live power cuts as dark patches.
// Colours are read from the theme's CSS variables at draw time.
import type * as maplibregl from "maplibre-gl";
import { isLiveOutage, type Cluster, type Notice } from "@/lib/issues";

type Feature = { type: "Feature"; properties: Record<string, string | number>; geometry: { type: "Polygon"; coordinates: number[][][] } };

function circle(lat: number, lng: number, radiusM: number, steps = 48): number[][][] {
  const pts: number[][] = [];
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push([lng + Math.cos(a) * dLng, lat + Math.sin(a) * dLat]);
  }
  return [pts];
}

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888888";
}

const NOTICE_VAR: Record<string, string> = {
  road_permit: "--works", power_shutdown: "--outage", water_suspension: "--water", resurfacing: "--fg-2", completion: "--ok", incident: "--alert", works: "--works",
};

export function noticeFeatures(notices: Notice[], now = Date.now()) {
  const features: Feature[] = notices
    // what matters today: notices in force, upcoming or ended in the last day; undated incidents from the last 60 days
    .filter((n) => n.kind === "works" || (n.ends_at ? new Date(n.ends_at).getTime() > now - 86_400_000 : new Date(n.starts_at).getTime() > now - 60 * 86_400_000))
    .map((n) => ({
      type: "Feature",
      properties: { kind: n.kind, color: cssVar(NOTICE_VAR[n.kind] ?? "--fg-3"), title: n.title },
      geometry: { type: "Polygon", coordinates: circle(n.lat, n.lng, n.radius_m) },
    }));
  return { type: "FeatureCollection" as const, features };
}

export function outageFeatures(clusters: Cluster[]) {
  const features: Feature[] = clusters.filter(isLiveOutage).flatMap((c) => [
    { type: "Feature", properties: { ring: 0 }, geometry: { type: "Polygon", coordinates: circle(c.lat, c.lng, 340) } },
    { type: "Feature", properties: { ring: 1 }, geometry: { type: "Polygon", coordinates: circle(c.lat, c.lng, 220) } },
  ]);
  return { type: "FeatureCollection" as const, features };
}

// Adds (or re-adds after a style change) every overlay. Safe to call repeatedly.
export function addOverlays(m: maplibregl.Map, notices: Notice[], clusters: Cluster[]) {
  const outage = cssVar("--outage");
  const set = (id: string, data: unknown) => {
    const src = m.getSource(id) as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(data as GeoJSON.GeoJSON);
    else m.addSource(id, { type: "geojson", data: data as GeoJSON.GeoJSON });
  };
  set("theru-notices", noticeFeatures(notices));
  set("theru-outages", outageFeatures(clusters));

  if (!m.getLayer("theru-notices-fill")) {
    m.addLayer({ id: "theru-notices-fill", type: "fill", source: "theru-notices", paint: { "fill-color": ["get", "color"], "fill-opacity": 0.1 } });
    m.addLayer({ id: "theru-notices-line", type: "line", source: "theru-notices", paint: { "line-color": ["get", "color"], "line-width": 1.4, "line-dasharray": [3, 2], "line-opacity": 0.8 } });
  }
  if (!m.getLayer("theru-outages")) {
    m.addLayer({ id: "theru-outages", type: "fill", source: "theru-outages", paint: { "fill-color": "#000000", "fill-opacity": ["case", ["==", ["get", "ring"], 1], 0.42, 0.26] } });
    m.addLayer({ id: "theru-outages-edge", type: "line", source: "theru-outages", filter: ["==", ["get", "ring"], 0], paint: { "line-color": outage, "line-width": 1.6, "line-blur": 2, "line-opacity": 0.9 } });
  }
}
