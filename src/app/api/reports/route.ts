import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { dbError, err, guardWrite, reporterHash, rpcToken } from "@/lib/api";

const Report = z.object({
  kind: z.enum(["pothole", "waterlogging", "worksite"]),
  lat: z.number().min(6).max(37.5),
  lng: z.number().min(68).max(97.5),
  // pothole: small/medium/large · waterlogging: ankle/knee/waist · worksite: minor/lane blocked/road blocked
  severity: z.number().int().min(1).max(3),
  note: z.string().trim().max(500).optional(),
  department: z.string().trim().max(120).optional(),
  promisedEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // Only URLs our own /api/photos produced are accepted.
  photo: z.url({ protocol: /^https$/, hostname: /\.public\.blob\.vercel-storage\.com$/ }).max(200).optional(),
});

export async function POST(req: Request) {
  const blocked = guardWrite(req);
  if (blocked) return blocked;

  const parsed = Report.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("invalid report", 400);
  const r = parsed.data;

  const { data, error } = await supabase().rpc("submit_report", {
    p_token: rpcToken(),
    p_kind: r.kind,
    p_lat: r.lat,
    p_lng: r.lng,
    p_severity: r.severity,
    p_note: r.note ?? null,
    p_department: r.kind === "worksite" ? (r.department ?? null) : null,
    p_promised_end: r.kind === "worksite" ? (r.promisedEnd ?? null) : null,
    p_photo_path: r.photo ?? null,
    p_reporter_hash: reporterHash(req),
  });
  if (error) return dbError(error);
  return Response.json(data, { status: 201 });
}
