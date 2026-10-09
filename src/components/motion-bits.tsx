"use client";

// Small animation primitives in the spirit of Magic UI (BlurFade, NumberTicker, TextAnimate).
import { useEffect, useRef } from "react";
import { animate, motion, useInView, useReducedMotion } from "motion/react";

const EASE = [0.2, 0.8, 0.2, 1] as const;

export function BlurFade({ children, delay = 0, y = 12, className, inView = false }: {
  children: React.ReactNode; delay?: number; y?: number; className?: string; inView?: boolean;
}) {
  const reduce = useReducedMotion();
  const hidden = { opacity: 0, y: reduce ? 0 : y, filter: reduce ? "blur(0px)" : "blur(8px)" };
  const shown = { opacity: 1, y: 0, filter: "blur(0px)" };
  return (
    <motion.div className={className} initial={reduce ? false : hidden}
      {...(inView ? { whileInView: shown, viewport: { once: true, margin: "-60px" } } : { animate: shown })}
      transition={{ duration: 0.7, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

// Headline that resolves word by word.
export function WordReveal({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <span className={className} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <motion.span key={i} aria-hidden className="inline-block whitespace-pre"
          initial={reduce ? false : { opacity: 0, y: "0.35em", filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: delay + i * 0.06, ease: EASE }}>
          {w}{" "}
        </motion.span>
      ))}
    </span>
  );
}

export function NumberTicker({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || !seen) return;
    if (reduce) { el.textContent = String(value); return; }
    const c = animate(0, value, { duration: 1.4, ease: EASE, onUpdate: (v) => { el.textContent = String(Math.round(v)); } });
    return () => c.stop();
  }, [seen, value, reduce]);
  return <span ref={ref} className={`tabular-nums ${className ?? ""}`}>0</span>;
}

export const listContainer = { hidden: {}, show: { transition: { staggerChildren: 0.045 } } };
export const listItem = {
  hidden: { opacity: 0, x: -10, filter: "blur(4px)" },
  show: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.45, ease: EASE } },
};
