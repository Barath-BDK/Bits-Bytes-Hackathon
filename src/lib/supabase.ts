import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-side client with the publishable key; table access is governed by RLS.
export function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars are not set");
  return createClient(url, key, { auth: { persistSession: false } });
}
