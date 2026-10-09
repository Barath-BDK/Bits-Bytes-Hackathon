import { err } from "@/lib/api";

// Place search for the map. Queries two OpenStreetMap geocoders and merges them:
// Photon is fast at prefix matches; Nominatim knows abbreviations and alternate names (e.g. "IIITDM").
// Identical queries are cached for a day, which keeps us well inside both services' fair-use policies.
type Place = { name: string; area: string; kind: string; lat: number; lng: number };
const UA = { "User-Agent": "theru/0.1 (https://theru.vercel.app)" };
const CHENNAI = { lat: 13.04, lng: 80.22 };

async function photon(q: string): Promise<Place[]> {
  type F = { geometry: { coordinates: [number, number] }; properties: { name?: string; street?: string; district?: string; city?: string; county?: string; state?: string; osm_value?: string } };
  const url = `https://photon.komoot.io/api/?${new URLSearchParams({ q, limit: "6", lat: String(CHENNAI.lat), lon: String(CHENNAI.lng), bbox: "68,6,97.5,37.5", lang: "en" })}`;
  const res = await fetch(url, { headers: UA, next: { revalidate: 86_400 }, signal: AbortSignal.timeout(4000) }).catch(() => null);
  if (!res?.ok) return [];
  const body = (await res.json()) as { features?: F[] };
  return (body.features ?? []).map((f) => {
    const p = f.properties;
    const name = p.name ?? p.street ?? "Unnamed place";
    const area = [p.district, p.city ?? p.county, p.state].filter((x, i, a) => x && x !== name && a.indexOf(x) === i).join(", ");
    return { name, area, kind: p.osm_value ?? "", lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] };
  });
}

async function nominatim(q: string): Promise<Place[]> {
  type R = { lat: string; lon: string; name?: string; display_name: string; type?: string };
  // viewbox biases results towards greater Chennai without excluding the rest of India
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q, format: "jsonv2", limit: "6", countrycodes: "in", viewbox: "79.6,13.6,80.6,12.4", "accept-language": "en" })}`;
  const res = await fetch(url, { headers: UA, next: { revalidate: 86_400 }, signal: AbortSignal.timeout(4000) }).catch(() => null);
  if (!res?.ok) return [];
  const rows = (await res.json()) as R[];
  return rows.map((r) => {
    const parts = r.display_name.split(", ");
    const name = r.name || parts[0];
    return { name, area: parts.slice(1, 4).filter((x) => x !== name).join(", "), kind: r.type ?? "", lat: Number(r.lat), lng: Number(r.lon) };
  });
}

const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 111 * Math.cos((a.lat * Math.PI) / 180));

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 80) return err("query must be 2-80 characters", 400);

  const [a, b] = await Promise.all([photon(q), q.length >= 3 ? nominatim(q) : Promise.resolve([])]);
  if (!a.length && !b.length) return Response.json([], { headers: { "Cache-Control": "public, s-maxage=3600" } });

  // Merge, drop near-duplicates (same place within 150 m), then rank by closeness to Chennai.
  const merged: Place[] = [];
  for (const p of [...b, ...a]) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    if (merged.some((m) => km(m, p) < 0.15)) continue;
    merged.push(p);
  }
  const needle = q.toLowerCase();
  // distance to Chennai in km, with a 50 km handicap for results whose name does not contain the query
  const score = (p: Place) => km(p, CHENNAI) + (p.name.toLowerCase().includes(needle) ? 0 : 50);
  merged.sort((x, y) => score(x) - score(y));
  return Response.json(merged.slice(0, 7), { headers: { "Cache-Control": "public, s-maxage=86400" } });
}
