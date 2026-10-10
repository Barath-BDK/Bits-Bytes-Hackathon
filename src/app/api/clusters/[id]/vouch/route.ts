import { z } from "zod";
import { revalidateTag } from "next/cache";
import { CLUSTERS_TAG } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { dbError, err, guardWrite, reporterHash, rpcToken } from "@/lib/api";

// "I need this too": one vouch per person per issue, counted as a supporter. No body is needed.
export async function POST(req: Request, ctx: RouteContext<"/api/clusters/[id]/vouch">) {
  const blocked = guardWrite(req, 200);
  if (blocked) return blocked;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return err("not found", 404);

  const { data, error } = await supabase().rpc("vouch_cluster", {
    p_token: rpcToken(),
    p_cluster_id: id,
    p_reporter_hash: reporterHash(req),
  });
  if (error) return dbError(error);
  revalidateTag(CLUSTERS_TAG, { expire: 0 });
  return Response.json(data);
}
