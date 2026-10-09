import sharp from "sharp";
import { put } from "@vercel/blob";
import { supabase } from "@/lib/supabase";
import { dbError, err, guardWrite, reporterHash, rpcToken } from "@/lib/api";

const MAX_BYTES = 4_000_000; // Vercel caps function bodies at 4.5 MB; the client downsizes first
const FORMATS = new Set(["jpeg", "png", "webp", "heif"]);

export async function POST(req: Request) {
  const blocked = guardWrite(req, MAX_BYTES + 10_000);
  if (blocked) return blocked;

  const file = (await req.formData().catch(() => null))?.get("photo");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_BYTES) return err("photo must be an image under 4 MB", 400);

  const input = Buffer.from(await file.arrayBuffer());
  // Trust the decoded bytes, never the filename or declared MIME type.
  const meta = await sharp(input).metadata().catch(() => null);
  if (!meta?.format || !FORMATS.has(meta.format)) return err("unsupported image type", 400);

  const { error } = await supabase().rpc("note_upload", { p_token: rpcToken(), p_reporter_hash: reporterHash(req) });
  if (error) return dbError(error);

  // Re-encoding strips EXIF (including GPS) and any embedded payloads.
  const webp = await sharp(input, { limitInputPixels: 40_000_000 })
    .rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 74 }).toBuffer();

  const blob = await put("reports/photo.webp", webp, { access: "public", contentType: "image/webp", addRandomSuffix: true });
  return Response.json({ url: blob.url }, { status: 201 });
}
