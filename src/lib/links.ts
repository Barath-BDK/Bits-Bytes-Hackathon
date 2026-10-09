// Link to a street dossier. Shared by server and client code.
export function streetHref(p: { lat: number; lng: number; name: string; area?: string }) {
  const q = new URLSearchParams({ lat: p.lat.toFixed(5), lng: p.lng.toFixed(5), name: p.name.slice(0, 80) });
  if (p.area) q.set("area", p.area.slice(0, 120));
  return `/street?${q}`;
}
