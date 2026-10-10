"use client";

// The top bar. The name leads, much larger than the links, so the first thing anyone reads is what this is.
// On phones the links fold into a menu with large tap targets; Report stays visible.
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ModeToggle } from "@/components/mode-toggle";

const NAV = [
  { href: "/street", label: "Your street", hint: "Look up any street's record" },
  { href: "/map", label: "Map", hint: "Live map of reports and works" },
  { href: "/requests", label: "Requests", hint: "What residents are asking for" },
  { href: "/records", label: "Records", hint: "Findings and published notices" },
  { href: "/about", label: "Method", hint: "Sources, rules and limits" },
];

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = NAV.find((n) => path.startsWith(n.href))?.href;
  // close the menu on navigation
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to a route change
  useEffect(() => { setOpen(false); }, [path]);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Theru, home" className="shrink-0 text-[28px] font-bold leading-none tracking-[-0.05em] text-fg transition hover:opacity-80">
          Theru
        </Link>

        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} title={n.hint} aria-current={active === n.href ? "page" : undefined}
              className={`relative whitespace-nowrap rounded-md px-3 py-2 text-[15px] transition ${active === n.href ? "font-medium text-fg" : "text-fg-2 hover:bg-surface-2 hover:text-fg"}`}>
              {n.label}
              {active === n.href && <motion.span layoutId="nav-underline" className="absolute inset-x-3 -bottom-[13px] h-[2px] bg-accent" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="hidden md:block"><ModeToggle /></div>
          <Link href="/map?report=1" className="whitespace-nowrap rounded-[8px] bg-accent px-3.5 py-2 text-sm font-medium text-accent-fg transition hover:opacity-90 focus-visible:outline-offset-2 sm:px-4">
            <span className="sm:hidden">Report</span><span className="hidden sm:inline">Report a problem</span>
          </Link>
          <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-10 w-10 place-items-center rounded-[8px] text-fg transition hover:bg-surface-2 md:hidden">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav id="mobile-nav" aria-label="Main" data-lenis-prevent
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden border-t border-line bg-bg md:hidden">
            <ul className="px-2 py-2">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} aria-current={active === n.href ? "page" : undefined}
                    className={`flex items-center justify-between rounded-[8px] px-3 py-3.5 text-base ${active === n.href ? "bg-surface-2 font-medium text-fg" : "text-fg-2"}`}>
                    <span>{n.label}</span><span className="text-sm text-fg-3">{n.hint}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-line px-5 py-3">
              <span className="text-sm text-fg-2">Light or dark mode</span>
              <ModeToggle />
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
