"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export type NewsItem = { text: string; href?: string };

// One update at a time instead of a scrolling ticker: easier to read, pauses while hovered or focused,
// steps with the arrows, and each item can be opened. (After Magic UI's Word Rotate.)
export function NewsRotator({ items, interval = 4800 }: { items: NewsItem[]; interval?: number }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || reduce || items.length < 2) return;
    const t = setTimeout(() => setI((n) => (n + 1) % items.length), interval);
    return () => clearTimeout(t);
  }, [i, paused, reduce, items.length, interval]);
  if (!items.length) return null;
  const cur = items[i % items.length];
  const step = (d: number) => setI((n) => (n + d + items.length) % items.length);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
      <div className="relative min-w-0 flex-1 overflow-hidden" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={i} initial={reduce ? false : { y: "70%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={reduce ? undefined : { y: "-70%", opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }} className="truncate text-sm text-fg">
            {cur.href ? <Link href={cur.href} className="underline decoration-line underline-offset-4 hover:decoration-fg">{cur.text}</Link> : cur.text}
          </motion.div>
        </AnimatePresence>
      </div>
      {items.length > 1 && (
        <div className="flex shrink-0 items-center gap-1">
          <span className="label mr-1 tabular-nums text-fg-3">{i + 1}/{items.length}</span>
          <button onClick={() => step(-1)} aria-label="Previous update" className="grid h-7 w-7 place-items-center rounded-md text-fg-2 transition hover:bg-surface-2 hover:text-fg">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <button onClick={() => step(1)} aria-label="Next update" className="grid h-7 w-7 place-items-center rounded-md text-fg-2 transition hover:bg-surface-2 hover:text-fg">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
