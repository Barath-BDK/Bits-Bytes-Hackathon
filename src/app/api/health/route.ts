import { connection } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  await connection(); // always run at request time, never prerender
  const { data, error } = await supabase().rpc("health");
  if (error) {
    console.error("health check failed", error.message);
    return Response.json({ api: "ok", db: "down" }, { status: 503 });
  }
  return Response.json({ api: "ok", ...data });
}
