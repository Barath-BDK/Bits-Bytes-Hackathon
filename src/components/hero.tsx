"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { CAPTIONS, HeroBackdrop, useThemeId } from "@/components/backdrops/hero-backdrop";
import { BlurFade, WordReveal } from "@/components/motion-bits";
import { StreetPicker } from "@/components/street-picker";
import { NewsRotator, type NewsItem } from "@/components/news-rotator";

// Streets from across India; Chennai has the deepest data (zones, notices, mapped works).
const EXAMPLES = [
  { name: "MG Road", area: "Bengaluru", lat: 12.9756, lng: 77.605 },
  { name: "Connaught Place", area: "New Delhi", lat: 28.6315, lng: 77.2167 },
  { name: "Linking Road", area: "Mumbai", lat: 19.064, lng: 72.834 },
  { name: "Velachery Main Road", area: "Chennai", lat: 12.9793, lng: 80.2189 },
  { name: "Park Street", area: "Kolkata", lat: 22.553, lng: 88.352 },
  { name: "Banjara Hills Road 1", area: "Hyderabad", lat: 17.4126, lng: 78.4482 },
  { name: "FC Road", area: "Pune", lat: 18.5236, lng: 73.8411 },
  { name: "CG Road", area: "Ahmedabad", lat: 23.03, lng: 72.56 },
];

export function Hero({ ticker }: { ticker: NewsItem[] }) {
  const ref = useRef<HTMLElement>(null);
  const theme = useThemeId();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const artY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const artScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const artOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.25]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);

  return (
    <section ref={ref} className="relative isolate flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden bg-bg">
      <motion.div style={{ y: artY, scale: artScale, opacity: artOpacity }} className="absolute inset-0 -z-10">
        <HeroBackdrop />
      </motion.div>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--bg)_0%,color-mix(in_oklab,var(--bg)_72%,transparent)_42%,transparent_72%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-bg to-transparent" />
      {/* phones: the text spans the full width, so the drawing sits further back */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-bg/70 md:hidden" />

      <motion.div style={{ y: textY }} className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 py-20 sm:px-6">
        <h1 className="display max-w-[16ch] text-[clamp(2.9rem,7.4vw,6.8rem)] [text-wrap:balance]">
          <WordReveal text="Every street has a record." accent={["record."]} delay={0.15} />
        </h1>
        <BlurFade delay={0.6}>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-fg-2">
            See who is digging your street, what goes off in the next two days, and what neighbours have reported.
            Then send it to the office that answers for it.
          </p>
        </BlurFade>
        <BlurFade delay={0.72} className="mt-8 max-w-2xl">
          <StreetPicker examples={EXAMPLES.slice(0, 5)} />
          <Link href="/about" className="mt-5 inline-flex items-center gap-1.5 text-sm text-fg-2 underline decoration-line underline-offset-4 transition hover:text-accent hover:decoration-accent">
            Where the data comes from: official notices, news reports, OpenStreetMap and residents
          </Link>
        </BlurFade>
      </motion.div>

      <BlurFade delay={1} className="relative border-y border-line bg-bg/90">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6">
          <span className="label shrink-0 text-accent">Just in</span>
          <NewsRotator items={ticker} />
          <span className="label hidden max-w-[34ch] shrink-0 truncate text-fg-3 lg:block" title={CAPTIONS[theme]}>{CAPTIONS[theme]}</span>
        </div>
      </BlurFade>
    </section>
  );
}
