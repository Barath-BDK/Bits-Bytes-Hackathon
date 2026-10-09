"use client";

// Small animated drawings for the sheets on the home and record pages.
import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { KindBadge } from "@/components/kind-icon";
import { AnimatedBeam } from "@/components/magicui/animated-beam";

const EASE = [0.2, 0.8, 0.2, 1] as const;

// A scrap of the same street plan the Mono hero uses.
function Streets() {
  return (
    <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <g fill="none" stroke="var(--fg)" strokeLinecap="round">
        <g strokeWidth="1" opacity="0.18">
          {["M20 0L44 160", "M110 0L96 160", "M190 0L214 160", "M280 0L262 160", "M360 0L380 160", "M0 40L400 28", "M0 118L400 132"].map((d) => <path key={d} d={d} />)}
        </g>
        <path d="M-10 84C120 60 260 104 410 70" strokeWidth="2.4" opacity="0.4" />
      </g>
    </svg>
  );
}

export function DropPin() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "-40px" });
  return (
    <div ref={ref} className="relative h-36 overflow-hidden rounded-[4px] border border-line bg-bg/40">
      <Streets />
      {([["pothole", 18, 58], ["waterlogging", 64, 30], ["worksite", 82, 64]] as const).map(([k, x, y], i) => (
        <motion.div key={k} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}
          initial={{ opacity: 0, scale: 0.6 }} animate={seen ? { opacity: 1, scale: 1 } : {}} transition={{ delay: 0.15 + i * 0.12, duration: 0.4, ease: EASE }}>
          <KindBadge kind={k} size={28} />
        </motion.div>
      ))}
      {/* the new report drops in and lands with a ripple */}
      <div className="absolute left-[42%] top-[56%]">
        <motion.span className="absolute -left-5 -top-5 h-10 w-10 rounded-full border-2 border-accent" initial={{ opacity: 0, scale: 0.2 }}
          animate={seen ? { opacity: [0, 0.9, 0], scale: [0.2, 1.6, 2.2] } : {}} transition={{ delay: 1.05, duration: 1.1, repeat: Infinity, repeatDelay: 2.4 }} />
        <motion.svg width="26" height="34" viewBox="0 0 26 34" className="absolute -left-[13px] -top-[34px]" initial={{ y: -90, opacity: 0 }}
          animate={seen ? { y: [-90, 0, -6, 0], opacity: 1 } : {}} transition={{ delay: 0.6, duration: 0.7, times: [0, 0.7, 0.85, 1], ease: "easeOut" }}>
          <path d="M13 33S2 20 2 12.5a11 11 0 0 1 22 0C24 20 13 33 13 33z" fill="var(--accent)" stroke="var(--bg)" strokeWidth="2" />
          <circle cx="13" cy="12.5" r="4" fill="var(--accent-fg)" />
        </motion.svg>
      </div>
    </div>
  );
}

function Dot({ x, y, r }: { x: number; y: number; r: React.Ref<HTMLDivElement> }) {
  return (
    <div ref={r} className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
      <KindBadge kind="pothole" size={24} />
    </div>
  );
}

export function MergeBeams() {
  const box = useRef<HTMLDivElement>(null);
  const hub = useRef<HTMLDivElement>(null);
  const a = useRef<HTMLDivElement>(null), b = useRef<HTMLDivElement>(null), c = useRef<HTMLDivElement>(null), d = useRef<HTMLDivElement>(null);
  const beam = { containerRef: box, toRef: hub, duration: 3.2, pathColor: "var(--fg-3)", pathOpacity: 0.35, pathWidth: 1.5, gradientStartColor: "var(--accent)", gradientStopColor: "var(--pothole)" };
  return (
    <div ref={box} className="relative h-36 overflow-hidden rounded-[4px] border border-line bg-bg/40">
      <Streets />
      <Dot x={12} y={26} r={a} /><Dot x={14} y={76} r={b} /><Dot x={86} y={22} r={c} /><Dot x={88} y={74} r={d} />
      <div ref={hub} className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <span className="relative block">
          <KindBadge kind="pothole" size={42} />
          <span className="absolute -right-2.5 -top-2.5 grid h-5 min-w-5 place-items-center rounded-full bg-fg px-1 font-mono text-[11px] text-bg">4</span>
        </span>
      </div>
      <AnimatedBeam {...beam} fromRef={a} curvature={30} delay={0} />
      <AnimatedBeam {...beam} fromRef={b} curvature={-30} delay={0.35} />
      <AnimatedBeam {...beam} fromRef={c} curvature={30} delay={0.7} reverse />
      <AnimatedBeam {...beam} fromRef={d} curvature={-30} delay={1.05} reverse />
    </div>
  );
}

export type Part = { label: string; points: number };
const SEG_COLORS = ["var(--pothole)", "var(--accent)", "var(--fg-3)", "var(--works)"];

// The priority score as an itemised ledger with a bar that fills term by term.
export function PriorityLedger({ parts, total, compact = false }: { parts: Part[]; total: number; compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "-40px" });
  const sum = Math.max(1, parts.reduce((n, p) => n + p.points, 0));
  return (
    <div ref={ref}>
      <div className="flex items-end justify-between">
        <span className={`${compact ? "text-5xl" : "text-6xl"} font-semibold tabular-nums leading-none tracking-[-0.06em]`}>{total}</span>
        <span className="label pb-1 text-fg-3">points</span>
      </div>
      <div className="mt-4 flex h-3 overflow-hidden rounded-[2px] bg-surface-2">
        {parts.map((p, i) => (
          <motion.span key={p.label} className={i === 3 ? "stripes" : ""} style={{ background: i === 3 ? undefined : SEG_COLORS[i] }}
            initial={{ width: 0 }} animate={seen ? { width: `${(p.points / sum) * 100}%` } : {}} transition={{ delay: 0.2 + i * 0.25, duration: 0.6, ease: EASE }} />
        ))}
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {parts.map((p, i) => (
          <motion.li key={p.label} className="flex items-baseline gap-2" initial={{ opacity: 0, x: -6 }} animate={seen ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.25 + i * 0.25, duration: 0.4 }}>
            <span className={`h-2.5 w-2.5 shrink-0 translate-y-[1px] rounded-[2px] ${i === 3 ? "stripes" : ""}`} style={{ background: i === 3 ? undefined : SEG_COLORS[i] }} />
            <span className="text-fg-2">{p.label}</span>
            <span className="mb-1 flex-1 border-b border-dotted border-fg-3/50" />
            <span className="font-mono text-fg">+{p.points}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export function FixedStamp() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "-40px" });
  return (
    <div ref={ref} className="relative h-36 overflow-hidden rounded-[4px] border border-line bg-bg/40 px-4 py-3 font-mono text-[12px] text-fg-2">
      {["Neighbour 1", "Neighbour 2"].map((n, i) => (
        <motion.p key={n} className="flex items-center gap-2 border-b border-dotted border-line py-2" initial={{ opacity: 0 }} animate={seen ? { opacity: 1 } : {}} transition={{ delay: 0.2 + i * 0.3 }}>
          <span className="w-24">{n}</span><span className="text-ok">fixed</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
        </motion.p>
      ))}
      <motion.div className="absolute bottom-3 right-4 rounded-[6px] border-[3px] border-double border-ok px-3 py-1.5 text-center font-mono text-[13px] font-semibold uppercase tracking-[0.18em] text-ok"
        initial={{ opacity: 0, scale: 2.2, rotate: -4 }} animate={seen ? { opacity: 0.9, scale: 1, rotate: -11 } : {}}
        transition={{ delay: 0.95, type: "spring", stiffness: 420, damping: 16 }}>
        Confirmed<br />fixed
      </motion.div>
    </div>
  );
}
