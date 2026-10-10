"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";

export type HeroPhoto = { file: string; kind: string; title: string; author: string; license: string; license_url?: string; source: string };

const KIND_WORD: Record<string, string> = { pothole: "A damaged road", waterlogging: "A flooded street", worksite: "Road works" };
const clean = (t: string) => t.replace(/\.(webp|jpe?g|png)$/i, "").replace(/\s*\(\d+\)$/, "").replace(/_/g, " ");

// The hero photograph cross-fades through every photo the site uses, each credited as its licence asks.
// Only the previous, visible and next photos are mounted, so the page never loads all of them at once.
export function HeroPhotos({ photos, interval = 6000 }: { photos: HeroPhoto[]; interval?: number }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (reduce || paused || photos.length < 2) return;
    const t = setTimeout(() => setI((n) => (n + 1) % photos.length), interval);
    return () => clearTimeout(t);
  }, [i, reduce, paused, photos.length, interval]);
  const cur = photos[i];
  const next = (i + 1) % photos.length;
  const prev = (i - 1 + photos.length) % photos.length; // stays mounted while the new photo fades in over it

  return (
    <figure className="relative h-64 sm:h-80 lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[47%]"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {photos.map((p, k) => (k === i || k === next || k === prev) && (
        <div key={p.file} className={`hero-slide absolute inset-0 overflow-hidden ${k === i ? "z-[1]" : ""}`} data-on={k === i || k === prev} aria-hidden={k !== i}>
          <Image src={`/seed/${p.file}`} alt={k === i ? `${KIND_WORD[p.kind] ?? "A street"}: ${clean(p.title)}` : ""} fill priority={k === 0}
            sizes="(min-width:1024px) 47vw, 100vw" className="object-cover" />
        </div>
      ))}
      <span className="absolute inset-0 z-[2] bg-[linear-gradient(90deg,var(--bg)_0%,transparent_38%),linear-gradient(0deg,rgb(15_17_18/0.72)_0%,transparent_45%)] max-lg:bg-[linear-gradient(0deg,var(--bg)_2%,transparent_60%)]" aria-hidden />
      <figcaption className="note absolute right-4 top-4 z-[3] max-w-[calc(100%-2rem)] rounded-[3px] bg-black/65 px-2 py-1 text-white sm:right-6 lg:bottom-5 lg:top-auto">
        <span className="hidden sm:inline">{clean(cur.title)}. </span>Photo: <a href={cur.source} className="underline underline-offset-2">{cur.author.split(" from ")[0]}</a>,{" "}
        {cur.license_url ? <a href={cur.license_url} className="underline underline-offset-2">{cur.license}</a> : cur.license}
      </figcaption>
    </figure>
  );
}
