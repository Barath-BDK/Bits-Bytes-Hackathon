"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DEFAULT_MODE, DEFAULT_THEME, THEMES, type Mode, type ThemeId } from "@/lib/themes";

// The <html> data attributes are the source of truth (set before paint by the boot script).
function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-mode"] });
  return () => obs.disconnect();
}
const readTheme = () => (document.documentElement.getAttribute("data-theme") as ThemeId) || DEFAULT_THEME;
const readMode = () => (document.documentElement.getAttribute("data-mode") as Mode) || DEFAULT_MODE;

function save(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode: theme just won't persist */ }
}

export function ThemeControls() {
  const [open, setOpen] = useState(false);
  const theme = useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME);
  const mode = useSyncExternalStore(subscribe, readMode, () => DEFAULT_MODE);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !panel.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  function applyMode(m: Mode) {
    document.documentElement.setAttribute("data-mode", m);
    save("gw-mode", m);
  }
  function applyTheme(t: ThemeId) {
    document.documentElement.setAttribute("data-theme", t);
    save("gw-theme", t);
  }

  return (
    <div className="relative flex items-center gap-1" ref={panel}>
      <button onClick={() => applyMode(mode === "dark" ? "light" : "dark")} aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
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

      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Appearance settings"
        className="grid h-9 w-9 place-items-center rounded-full text-fg-2 transition hover:bg-surface-2 hover:text-fg">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div role="dialog" aria-label="Appearance"
            initial={{ opacity: 0, y: -8, scale: 0.97, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, scale: 0.98, filter: "blur(4px)" }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="panel absolute right-0 top-11 z-50 w-[300px] origin-top-right rounded-2xl p-3 shadow-2xl">
            <p className="label px-1 text-fg-3">Mode</p>
            <div className="relative mt-2 grid grid-cols-2 rounded-xl bg-surface-2 p-1">
              {(["dark", "light"] as Mode[]).map((m) => (
                <button key={m} onClick={() => applyMode(m)} className="relative z-10 rounded-lg py-1.5 text-sm capitalize">
                  {mode === m && <motion.span layoutId="mode-pill" className="absolute inset-0 -z-10 rounded-lg bg-bg shadow" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                  {m}
                </button>
              ))}
            </div>
            <p className="label mt-4 px-1 text-fg-3">Colour theme</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {THEMES.map((t) => (
                <button key={t.id} onClick={() => applyTheme(t.id)} aria-pressed={theme === t.id}
                  className={`rounded-xl border p-2 text-left transition ${theme === t.id ? "border-accent bg-surface-2" : "border-line hover:border-fg-3"}`}>
                  <span className="flex h-6 overflow-hidden rounded-md">
                    {t.swatch.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}
                  </span>
                  <span className="mt-1.5 block text-sm font-medium">{t.name}</span>
                  <span className="block text-[11px] leading-tight text-fg-3">{t.note}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
