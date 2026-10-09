import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { dbError, err, guardWrite, reporterHash, rpcToken } from "@/lib/api";

const Confirm = z.object({ verdict: z.enum(["fixed", "still_there"]) });

export async function POST(req: Request, ctx: RouteContext<"/api/clusters/[id]/confirm">) {
  const blocked = guardWrite(req, 1_000);
  if (blocked) return blocked;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return err("not found", 404);

  const parsed = Confirm.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("verdict must be fixed or still_there", 400);

  const { data, error } = await supabase().rpc("confirm_cluster", {
    p_token: rpcToken(),
    p_cluster_id: id,
    p_verdict: parsed.data.verdict,
    p_reporter_hash: reporterHash(req),
  });
  if (error) return dbError(error);
  return Response.json(data);
}
