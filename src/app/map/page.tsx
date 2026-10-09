import type { Metadata } from "next";
import { connection } from "next/server";
import { getClusters } from "@/lib/data";
import { MapView } from "@/components/map-view";

export const metadata: Metadata = { title: "Live map" };

export default async function MapPage({ searchParams }: PageProps<"/map">) {
  await connection();
  const [clusters, sp] = await Promise.all([getClusters(), searchParams]);
  return <MapView clusters={clusters} startReporting={sp.report === "1"} focusId={typeof sp.c === "string" ? sp.c : null} />;
}
