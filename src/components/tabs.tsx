"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export type TabItem = { id: string; label: string; hint?: string; content: React.ReactNode };

const EASE = [0.2, 0.8, 0.2, 1] as const;

// Accessible tabs (WAI-ARIA tabs pattern): arrow keys move between tabs, Home/End jump, the active tab gets a sliding
// indicator. With `autoAdvance` the tabs step on by themselves with a progress line, pause while hovered or focused,
// and stop for good once the reader picks a tab. Panels cross-fade.
export function Tabs({ items, vertical = false, autoAdvance, className = "" }: {
  items: TabItem[]; vertical?: boolean; autoAdvance?: number; className?: string;
}) {
  const uid = useId();
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(!!autoAdvance && !reduce);
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0); // restarts the progress line on each step
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // only run the timer while the tabs are on screen
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!auto || paused || !visible || !autoAdvance) return;
    const t = setTimeout(() => { setActive((a) => (a + 1) % items.length); setCycle((c) => c + 1); }, autoAdvance);
    return () => clearTimeout(t);
  }, [auto, paused, visible, autoAdvance, active, items.length, cycle]);

  function pick(i: number, focus = false) {
    setAuto(false);
    setActive(i);
    if (focus) tabs.current[i]?.focus();
  }
  function onKey(e: React.KeyboardEvent) {
    const next = vertical ? ["ArrowDown", "ArrowRight"] : ["ArrowRight", "ArrowDown"];
    const prev = vertical ? ["ArrowUp", "ArrowLeft"] : ["ArrowLeft", "ArrowUp"];
    if (next.includes(e.key)) { e.preventDefault(); pick((active + 1) % items.length, true); }
    else if (prev.includes(e.key)) { e.preventDefault(); pick((active - 1 + items.length) % items.length, true); }
    else if (e.key === "Home") { e.preventDefault(); pick(0, true); }
    else if (e.key === "End") { e.preventDefault(); pick(items.length - 1, true); }
  }

  const cur = items[active];
  return (
    <div ref={root} className={`${vertical ? "grid grid-cols-1 gap-8 lg:grid-cols-[17rem_1fr]" : ""} ${className}`}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
      <div role="tablist" aria-orientation={vertical ? "vertical" : "horizontal"} onKeyDown={onKey}
        className={vertical
          ? "-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
          : "-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"}>
        {items.map((it, i) => {
          const on = i === active;
          return (
            <button key={it.id} ref={(el) => { tabs.current[i] = el; }} role="tab" id={`${uid}-tab-${it.id}`}
              aria-selected={on} aria-controls={`${uid}-panel-${it.id}`} tabIndex={on ? 0 : -1} onClick={() => pick(i)}
              className={`relative isolate shrink-0 whitespace-nowrap text-left transition ${vertical
                ? `rounded-[8px] px-4 py-3 lg:whitespace-normal ${on ? "text-fg" : "text-fg-3 hover:text-fg-2"}`
                : `px-4 pb-3 pt-2 text-[15px] ${on ? "text-fg" : "text-fg-3 hover:text-fg-2"}`}`}>
              {on && (vertical
                ? <motion.span layoutId={`${uid}-pill`} className="absolute inset-0 -z-10 rounded-[8px] border border-line bg-surface" transition={{ type: "spring", stiffness: 420, damping: 38 }} />
                : <motion.span layoutId={`${uid}-bar`} className="zebra absolute inset-x-3 -bottom-px h-[3px]" transition={{ type: "spring", stiffness: 480, damping: 40 }} />)}
              <span className="relative block font-medium tracking-[-0.01em]">{it.label}</span>
              {vertical && it.hint && <span className="relative mt-0.5 hidden text-sm leading-snug text-fg-3 lg:block">{it.hint}</span>}
              {/* auto-advance progress, along the active tab */}
              {on && auto && autoAdvance && (
                <span aria-hidden className={`absolute overflow-hidden bg-line ${vertical ? "bottom-1.5 left-4 right-4 h-[2px]" : "inset-x-3 -bottom-px h-[3px]"}`}>
                  <span key={cycle} className="tab-progress block h-full bg-accent" style={{ animationDuration: `${autoAdvance}ms`, animationPlayState: paused || !visible ? "paused" : "running" }} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className={vertical ? "min-w-0" : "mt-8"}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={cur.id} role="tabpanel" id={`${uid}-panel-${cur.id}`} aria-labelledby={`${uid}-tab-${cur.id}`} tabIndex={0}
            initial={reduce ? false : { opacity: 0, y: 10, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
            exit={reduce ? undefined : { opacity: 0, y: -6, filter: "blur(4px)" }} transition={{ duration: 0.35, ease: EASE }}
            className="outline-none">
            {cur.content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
