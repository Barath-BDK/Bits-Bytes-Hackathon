"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { CAPTIONS, HeroBackdrop, useThemeId } from "@/components/backdrops/hero-backdrop";
import { BlurFade, WordReveal } from "@/components/motion-bits";
import { StreetPicker } from "@/components/street-picker";

const EXAMPLES = [
  { name: "Velachery Main Road", area: "Velachery, Chennai", lat: 12.9793, lng: 80.2189 },
  { name: "Arcot Road", area: "Vadapalani, Chennai", lat: 13.0505, lng: 80.2121 },
  { name: "2nd Avenue", area: "Anna Nagar, Chennai", lat: 13.0872, lng: 80.2103 },
];

export function Hero({ ticker }: { ticker: string[] }) {
  const ref = useRef<HTMLElement>(null);
  const theme = useThemeId();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const artY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const artScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const artOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.25]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);

  return (
    <section ref={ref} className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-bg">
      <motion.div style={{ y: artY, scale: artScale, opacity: artOpacity }} className="absolute inset-0 -z-10">
        <HeroBackdrop />
      </motion.div>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--bg)_0%,color-mix(in_oklab,var(--bg)_72%,transparent)_42%,transparent_72%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-bg to-transparent" />

      <motion.div style={{ y: textY }} className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 py-20 sm:px-6">
        <h1 className="display max-w-[16ch] text-[clamp(2.9rem,7.4vw,6.8rem)] [text-wrap:balance]">
          <WordReveal text="Every street in Chennai has a record." accent={["record."]} delay={0.15} />
        </h1>
        <BlurFade delay={0.6}>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-fg-2">
            Who is digging it and under which permission, what goes off in the next two days, power cuts that start beside a trench,
            and what the official records leave out. Look up yours.
          </p>
        </BlurFade>
        <BlurFade delay={0.72} className="mt-8 max-w-2xl">
          <StreetPicker examples={EXAMPLES} />
        </BlurFade>
      </motion.div>

      <BlurFade delay={1} className="relative mb-[68px] border-y border-line bg-bg/80 md:mb-[84px]">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6">
          <span className="label shrink-0 text-accent">Just in</span>
          <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
            <div className="marquee flex w-max gap-10 text-sm text-fg-2 [animation-duration:50s]">
              {[...ticker, ...ticker].map((t, i) => <span key={i} aria-hidden={i >= ticker.length} className="whitespace-nowrap">{t}</span>)}
            </div>
          </div>
          <span className="label hidden max-w-[34ch] shrink-0 truncate text-fg-3 lg:block" title={CAPTIONS[theme]}>{CAPTIONS[theme]}</span>
        </div>
      </BlurFade>
    </section>
  );
}
