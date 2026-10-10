"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DEFAULTS, SETTINGS, SWITCH_FOR, THEMES, type SettingKey, type ThemeId } from "@/lib/themes";

type Key = "theme" | "mode" | SettingKey;

// The <html> data attributes are the source of truth (set before paint by the boot script).
function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true });
  return () => obs.disconnect();
}
function useSetting(key: Key) {
  return useSyncExternalStore(subscribe, () => document.documentElement.getAttribute(`data-${key}`) || DEFAULTS[key], () => DEFAULTS[key]);
}

// Theme and mode changes ripple out from the pointer using the View Transitions API.
function setSetting(key: Key, value: string, origin?: { x: number; y: number }) {
  const root = document.documentElement;
  try { localStorage.setItem(`th-${key}`, value); } catch { /* private mode: setting just won't persist */ }
  const apply = () => root.setAttribute(`data-${key}`, value);
  const visual = key === "theme" || key === "mode";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!visual || reduce || !("startViewTransition" in document)) return apply();
  if (origin) { root.style.setProperty("--vt-x", `${origin.x}px`); root.style.setProperty("--vt-y", `${origin.y}px`); }
  const chosen = root.getAttribute("data-switch") || DEFAULTS.switch;
  const nextTheme = (key === "theme" ? value : root.getAttribute("data-theme") || DEFAULTS.theme) as ThemeId;
  root.setAttribute("data-vt", chosen === "auto" ? SWITCH_FOR[nextTheme] ?? "circle" : chosen);
  root.classList.add("theme-vt");
  const vt = document.startViewTransition(apply);
  vt.finished.finally(() => root.classList.remove("theme-vt"));
}

const at = (e: React.MouseEvent) => ({ x: e.clientX, y: e.clientY });

export function ThemeControls({ up = false }: { up?: boolean }) {
  const [open, setOpen] = useState(false);
  const theme = useSetting("theme");
  const mode = useSetting("mode");
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

  return (
    <div className="relative flex items-center gap-0.5" ref={panel}>
      <button onClick={(e) => setSetting("mode", mode === "dark" ? "light" : "dark", at(e))} aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
        className={`${up ? "hidden md:grid" : "grid"} h-9 w-9 place-items-center rounded-full text-fg-2 transition hover:bg-surface-2 hover:text-fg`}>
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
          <motion.div role="dialog" aria-label="Appearance" data-lenis-prevent
            initial={{ opacity: 0, y: up ? 8 : -8, scale: 0.97, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: up ? 6 : -6, scale: 0.98, filter: "blur(4px)" }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className={`panel z-50 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-[12px] !bg-surface p-3 shadow-2xl ${up
              ? "fixed inset-x-3 bottom-[74px] md:absolute md:inset-x-auto md:bottom-14 md:right-0 md:w-[340px] md:origin-bottom-right"
              : "fixed inset-x-3 top-[68px] md:absolute md:inset-x-auto md:right-0 md:top-11 md:w-[340px] md:origin-top-right"}`}>
            <p className="label px-1 text-fg-3">Mode</p>
            <Segmented id="mode" value={mode} options={[["dark", "Dark"], ["light", "Light"]]} onPick={(v, e) => setSetting("mode", v, at(e))} />

            <p className="label mt-4 px-1 text-fg-3">Colour theme</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {THEMES.map((t) => (
                <button key={t.id} onClick={(e) => setSetting("theme", t.id, at(e))} aria-pressed={theme === t.id}
                  className={`rounded-xl border p-2 text-left transition ${theme === t.id ? "border-accent bg-surface-2" : "border-line hover:border-fg-3"}`}>
                  <span className="flex h-6 overflow-hidden rounded-md">
                    {t.swatch.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}
                  </span>
                  <span className="mt-1.5 block text-sm font-medium">{t.name}</span>
                  <span className="block text-[11px] leading-tight text-fg-3">{t.note}</span>
                </button>
              ))}
            </div>

            {(Object.keys(SETTINGS) as SettingKey[]).map((k) => <SettingRow key={k} k={k} />)}
            <p className="mt-4 px-1 text-[11px] leading-snug text-fg-3">Trial settings while we pick the final look. Saved in this browser only.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingRow({ k }: { k: SettingKey }) {
  const value = useSetting(k);
  return (
    <>
      <p className="label mt-4 px-1 text-fg-3">{SETTINGS[k].label}</p>
      <Segmented id={k} value={value} options={SETTINGS[k].options} onPick={(v) => setSetting(k, v)} />
    </>
  );
}

function Segmented({ id, value, options, onPick }: {
  id: string; value: string; options: readonly (readonly [string, string])[]; onPick: (v: string, e: React.MouseEvent) => void;
}) {
  return (
    <div className={`relative mt-2 grid gap-1 rounded-xl bg-surface-2 p-1 ${options.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
      {options.map(([v, label]) => (
        <button key={v} onClick={(e) => onPick(v, e)} aria-pressed={value === v} className="relative z-10 rounded-lg py-1.5 text-[13px]">
          {value === v && <motion.span layoutId={`pill-${id}`} className="absolute inset-0 -z-10 rounded-lg bg-bg shadow" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
          {label}
        </button>
      ))}
    </div>
  );
}
