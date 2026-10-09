"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { CAPTIONS, HeroBackdrop, useThemeId } from "@/components/backdrops/hero-backdrop";
import { BlurFade, WordReveal } from "@/components/motion-bits";

const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="transition-transform group-hover:translate-x-0.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

export function Hero({ openCount, ticker }: { openCount: number; ticker: string[] }) {
  const ref = useRef<HTMLElement>(null);
  const theme = useThemeId();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const artY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const artScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const artOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.25]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);

  return (
    <section ref={ref} className="relative isolate flex min-h-[calc(100svh-3.5rem)] flex-col overflow-hidden">
      <motion.div style={{ y: artY, scale: artScale, opacity: artOpacity }} className="absolute inset-0 -z-10">
        <HeroBackdrop />
      </motion.div>
      {/* keep text legible over the art: soft light from the left, fade into the page below */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--bg)_0%,color-mix(in_oklab,var(--bg)_70%,transparent)_38%,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-bg to-transparent" />

      <motion.div style={{ y: textY }} className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <BlurFade>
          <Link href="/map" className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface/50 py-1 pl-1 pr-3 text-[13px] text-fg-2 backdrop-blur-md transition hover:border-fg-3">
            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-fg">Live</span>
            {openCount} open issues across Chennai
            <Arrow />
          </Link>
        </BlurFade>
        <h1 className="display mt-7 max-w-[17ch] text-[clamp(2.9rem,7.4vw,6.8rem)] [text-wrap:balance]">
          <WordReveal text="Who dug up your road, and when will they fix it?" accent={["your"]} delay={0.15} />
        </h1>
        <BlurFade delay={0.6}>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-fg-2">
            One public map for every pothole, flooded street and work site in the city. Reports of the same spot merge,
            every neighbour pushes it up the queue, and damage beside an unfinished dig is traced to the agency that dug it.
          </p>
        </BlurFade>
        <BlurFade delay={0.72}>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/map?report=1" className="group flex items-center gap-2 rounded-xl bg-fg px-5 py-3 font-medium text-bg transition hover:opacity-85">Report an issue <Arrow /></Link>
            <Link href="/map" className="rounded-xl border border-line bg-surface/50 px-5 py-3 font-medium backdrop-blur-md transition hover:border-fg-3">Open the live map</Link>
          </div>
        </BlurFade>
      </motion.div>

      {/* Bottom rail: live ticker and the artwork caption */}
      <BlurFade delay={1} className="relative border-t border-line bg-bg/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6">
          <span className="label shrink-0 text-accent">Just in</span>
          <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
            <div className="marquee flex w-max gap-10 text-sm text-fg-2 [animation-duration:45s]">
              {[...ticker, ...ticker].map((t, i) => <span key={i} aria-hidden={i >= ticker.length} className="whitespace-nowrap">{t}</span>)}
            </div>
          </div>
          <span className="label hidden max-w-[34ch] shrink-0 truncate text-fg-3 lg:block" title={CAPTIONS[theme]}>{CAPTIONS[theme]}</span>
        </div>
      </BlurFade>
    </section>
  );
}
