import { supabase } from "@/lib/supabase";
import { dbError, err } from "@/lib/api";

// GET /api/clusters?bbox=minLng,minLat,maxLng,maxLat  (defaults to all of India)
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("bbox") ?? "68,6,97.5,37.5";
  const b = raw.split(",").map(Number);
  if (b.length !== 4 || b.some((n) => !Number.isFinite(n)) || b[0] >= b[2] || b[1] >= b[3]) {
    return err("bbox must be minLng,minLat,maxLng,maxLat", 400);
  }
  const { data, error } = await supabase().rpc("get_clusters", {
    min_lng: b[0], min_lat: b[1], max_lng: b[2], max_lat: b[3],
  });
  if (error) return dbError(error);
  return Response.json(data);
}
