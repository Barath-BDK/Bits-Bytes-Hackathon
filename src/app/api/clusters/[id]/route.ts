import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { dbError, err } from "@/lib/api";

export async function GET(_req: Request, ctx: RouteContext<"/api/clusters/[id]">) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return err("not found", 404);
  const { data, error } = await supabase().rpc("get_cluster", { p_id: id });
  if (error) return dbError(error);
  if (!data?.cluster) return err("not found", 404);
  return Response.json(data);
}
