"use client";

import { usePathname } from "next/navigation";
import { motion, useScroll, useSpring } from "motion/react";

// A hairline across the top that fills as you read, so a long page shows how far there is to go.
// Not on the full-screen map, which does not scroll.
export function ScrollProgress() {
  const path = usePathname();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 220, damping: 40, restDelta: 0.001 });
  if (path.startsWith("/map")) return null;
  return <motion.div aria-hidden style={{ scaleX }} className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-accent" />;
}
