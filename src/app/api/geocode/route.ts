import { err } from "@/lib/api";

// Proxy to Photon (OpenStreetMap geocoder): keeps searches inside India, biased to Chennai,
// and caches identical queries for a day so we stay well within its fair-use policy.
type Feature = {
  geometry: { coordinates: [number, number] };
  properties: { name?: string; street?: string; district?: string; city?: string; state?: string; osm_value?: string };
};

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 80) return err("query must be 2-80 characters", 400);

  const url = `https://photon.komoot.io/api/?${new URLSearchParams({ q, limit: "6", lat: "13.04", lon: "80.22", bbox: "68,6,97.5,37.5", lang: "en" })}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "gullywatch/0.1 (https://gullywatch.vercel.app)" },
    next: { revalidate: 86_400 },
    signal: AbortSignal.timeout(4000),
  }).catch(() => null);
  if (!res?.ok) return err("search is unavailable right now", 502);

  const body = (await res.json()) as { features?: Feature[] };
  const results = (body.features ?? []).map((f) => {
    const p = f.properties;
    const name = p.name ?? p.street ?? "Unnamed place";
    const area = [p.district, p.city, p.state].filter((x, i, a) => x && x !== name && a.indexOf(x) === i).join(", ");
    return { name, area, kind: p.osm_value ?? "", lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] };
  });
  return Response.json(results, { headers: { "Cache-Control": "public, s-maxage=86400" } });
}
