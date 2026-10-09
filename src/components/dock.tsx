"use client";

// Navigation as a strip of road at the bottom of the screen: lanes split by dashed markings,
// the current page marked by a zebra crossing. Replaces the usual logo-left, links-right top bar.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { StreetSign } from "@/components/street-sign";
import { ThemeControls } from "@/components/theme-controls";

const NAV = [
  { href: "/street", label: "Your street", short: "Street", icon: "M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" },
  { href: "/map", label: "Map", short: "Map", icon: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" },
  { href: "/records", label: "Records", short: "Records", icon: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7" },
  { href: "/about", label: "Method", short: "Method", icon: "M12 3v18M3 12h18M5.6 5.6l12.8 12.8", desktopOnly: true },
];

const Lane = () => <span aria-hidden className="lane-mark mx-1 hidden h-6 w-[2px] md:block" />;

export function Dock() {
  const path = usePathname();
  const active = NAV.find((n) => path.startsWith(n.href))?.href;
  return (
    <nav aria-label="Main" className="dock fixed inset-x-0 bottom-0 z-50 md:inset-x-auto md:bottom-5 md:left-1/2 md:-translate-x-1/2">
      <div className="flex items-stretch gap-0.5 border-t border-line bg-surface/95 px-1.5 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 shadow-2xl backdrop-blur-sm md:items-center md:rounded-[12px] md:border md:px-2 md:py-2">
        <Link href="/" aria-label="Theru home" className="grid shrink-0 place-items-center px-1.5 transition hover:-translate-y-0.5 md:px-1">
          <StreetSign size="sm" />
        </Link>
        <Lane />
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} aria-current={active === n.href ? "page" : undefined}
            className={`relative flex-1 flex-col items-center gap-1 rounded-md px-1.5 py-1.5 text-[11px] transition md:flex-none md:flex-row md:gap-2 md:px-3 md:py-2 md:text-sm ${"desktopOnly" in n ? "hidden md:flex" : "flex"} ${active === n.href ? "text-fg" : "text-fg-3 hover:text-fg"}`}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="md:hidden"><path d={n.icon} /></svg>
            <span className="md:hidden">{n.short}</span>
            <span className="hidden md:inline">{n.label}</span>
            {active === n.href && <motion.span layoutId="dock-zebra" className="zebra absolute inset-x-2 -bottom-0.5 h-[3px] md:-bottom-1" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
          </Link>
        ))}
        <Lane />
        <ThemeControls up />
        <Link href="/map?report=1" className="ml-1 hidden items-center rounded-[8px] bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:opacity-85 md:flex">
          Report
        </Link>
        <Link href="/map?report=1" aria-label="Report" className="grid shrink-0 place-items-center px-1 md:hidden">
          <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-accent text-accent-fg">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </span>
        </Link>
      </div>
    </nav>
  );
}
