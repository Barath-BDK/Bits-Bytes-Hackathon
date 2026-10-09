"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

// Lenis everywhere except the map, where the wheel belongs to zooming.
export function SmoothScroll() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/map") || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.1, autoRaf: true });
    return () => lenis.destroy();
  }, [pathname]);
  return null;
}
