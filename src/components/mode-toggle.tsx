"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DEFAULT_MODE, type Mode } from "@/lib/themes";

// The <html data-mode> attribute is the source of truth (set before paint by the boot script).
function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode"] });
  return () => obs.disconnect();
}
const readMode = () => (document.documentElement.getAttribute("data-mode") as Mode | null) ?? DEFAULT_MODE;

// The new mode ripples out from the pointer using the View Transitions API.
function setMode(value: Mode, origin: { x: number; y: number }) {
  const root = document.documentElement;
  try { localStorage.setItem("th-mode", value); } catch { /* private mode: the choice just won't persist */ }
  const apply = () => root.setAttribute("data-mode", value);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("startViewTransition" in document)) return apply();
  root.style.setProperty("--vt-x", `${origin.x}px`);
  root.style.setProperty("--vt-y", `${origin.y}px`);
  root.classList.add("theme-vt");
  document.startViewTransition(apply).finished.finally(() => root.classList.remove("theme-vt"));
}

export function ModeToggle() {
  const mode = useSyncExternalStore(subscribe, readMode, () => DEFAULT_MODE);
  const next: Mode = mode === "dark" ? "light" : "dark";
  return (
    <button onClick={(e) => setMode(next, { x: e.clientX, y: e.clientY })} aria-label={`Switch to ${next} mode`}
      className="grid h-9 w-9 place-items-center rounded-full text-fg-2 transition hover:bg-surface-2 hover:text-fg">
      <AnimatePresence mode="wait" initial={false}>
        <motion.svg key={mode} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
          initial={{ rotate: -70, opacity: 0, scale: 0.6 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 70, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.25 }}>
          {mode === "dark"
            ? <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
            : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>}
        </motion.svg>
      </AnimatePresence>
    </button>
  );
}
