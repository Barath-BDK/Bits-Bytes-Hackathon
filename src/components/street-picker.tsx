"use client";

import { useRouter } from "next/navigation";
import { PlaceSearch, type Place } from "@/components/place-search";
import { streetHref } from "@/lib/links";

export function StreetPicker({ examples }: { examples: { name: string; area: string; lat: number; lng: number }[] }) {
  const router = useRouter();
  return (
    <div>
      <div className="max-w-xl"><PlaceSearch onPick={(p: Place) => router.push(streetHref(p))} /></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="label self-center text-fg-3">Try</span>
        {examples.map((e) => (
          <button key={e.name} onClick={() => router.push(streetHref(e))}
            className="rounded-[6px] border border-line px-3 py-1.5 text-sm text-fg-2 transition hover:border-fg-3 hover:text-fg">{e.name}</button>
        ))}
      </div>
    </div>
  );
}
