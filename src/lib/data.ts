import "server-only";
import { supabase } from "@/lib/supabase";
import type { Cluster, ClusterDetail } from "@/lib/issues";

export async function getClusters(): Promise<Cluster[]> {
  const { data, error } = await supabase().rpc("get_clusters", { min_lng: 68, min_lat: 6, max_lng: 97.5, max_lat: 37.5 });
  if (error) throw new Error("could not load clusters");
  return data as Cluster[];
}

export async function getCluster(id: string): Promise<ClusterDetail | null> {
  const { data, error } = await supabase().rpc("get_cluster", { p_id: id });
  if (error) throw new Error("could not load cluster");
  return data?.cluster ? (data as ClusterDetail) : null;
}
