import "server-only";
import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { Cluster, ClusterDetail } from "@/lib/issues";

// Cached server-side and invalidated on every write (revalidateTag("clusters") in the API routes),
// so page loads skip the database round trip unless something changed.
export const CLUSTERS_TAG = "clusters";

export const getClusters = unstable_cache(
  async (): Promise<Cluster[]> => {
    const { data, error } = await supabase().rpc("get_clusters", { min_lng: 68, min_lat: 6, max_lng: 97.5, max_lat: 37.5 });
    if (error) throw new Error("could not load clusters");
    return data as Cluster[];
  },
  ["clusters-all"],
  { tags: [CLUSTERS_TAG], revalidate: 300 },
);

export const getCluster = unstable_cache(
  async (id: string): Promise<ClusterDetail | null> => {
    const { data, error } = await supabase().rpc("get_cluster", { p_id: id });
    if (error) throw new Error("could not load cluster");
    return data?.cluster ? (data as ClusterDetail) : null;
  },
  ["cluster-one"],
  { tags: [CLUSTERS_TAG], revalidate: 300 },
);
