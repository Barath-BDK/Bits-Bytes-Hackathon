import type { Metadata } from "next";
import { Suspense } from "react";
import { getClusters } from "@/lib/data";
import { MapView } from "@/components/map-view";
import Loading from "./loading";

export const metadata: Metadata = { title: "Live map" };
export const revalidate = 60;

export default async function MapPage() {
  const clusters = await getClusters();
  return (
    <Suspense fallback={<Loading />}>
      <MapView clusters={clusters} />
    </Suspense>
  );
}
