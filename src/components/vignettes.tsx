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

// A power cut spreading out from beside a trench: the dig-strike pattern.
export function StrikeVignette() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "-40px" });
  return (
    <div ref={ref} className="relative h-36 overflow-hidden rounded-[4px] border border-line bg-bg/40">
      <Streets />
      <motion.span className="absolute left-[46%] top-[58%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(closest-side, rgb(0 0 0 / 0.7), rgb(0 0 0 / 0.35) 60%, transparent)" }}
        initial={{ scale: 0, opacity: 0 }} animate={seen ? { scale: 1, opacity: 1 } : {}} transition={{ delay: 0.7, duration: 1.4, ease: EASE }} />
      <motion.span className="stripes absolute left-[36%] top-[50%] h-3 w-24 rounded-[2px]" initial={{ scaleX: 0 }} animate={seen ? { scaleX: 1 } : {}}
        style={{ originX: 0 }} transition={{ delay: 0.15, duration: 0.6, ease: EASE }} />
      <motion.span className="absolute left-[50%] top-[62%] -translate-x-1/2" initial={{ opacity: 0, scale: 0.5 }} animate={seen ? { opacity: 1, scale: 1 } : {}} transition={{ delay: 1.4, type: "spring", stiffness: 380, damping: 16 }}>
        <KindBadge kind="outage" size={30} />
      </motion.span>
      <motion.span className="label absolute bottom-2 right-3 text-outage" initial={{ opacity: 0 }} animate={seen ? { opacity: 1 } : {}} transition={{ delay: 1.8 }}>
        42 m from the trench
      </motion.span>
    </div>
  );
}

// Four rows of hours filling in: power, water, works, rain.
export function OutlookVignette() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "-40px" });
  const rows: [string, string, number[]][] = [
    ["Power", "var(--outage)", [9, 10, 11, 12, 13]], ["Water", "var(--water)", [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]],
    ["Works", "var(--works)", Array.from({ length: 24 }, (_, i) => i)], ["Rain", "var(--pothole)", [15, 16, 17]],
  ];
  return (
    <div ref={ref} className="h-36 space-y-2 rounded-[4px] border border-line bg-bg/40 p-3">
      {rows.map(([label, color, on], r) => (
        <div key={label} className="flex items-center gap-2">
          <span className="w-12 font-mono text-[10px] text-fg-3">{label}</span>
          <div className="flex flex-1 gap-[2px]">
            {Array.from({ length: 24 }, (_, i) => (
              <motion.span key={i} className="h-5 flex-1 rounded-[1px]" style={{ background: on.includes(i) ? color : "var(--surface-2)" }}
                initial={{ opacity: 0 }} animate={seen ? { opacity: on.includes(i) ? 0.95 : 1 } : {}} transition={{ delay: 0.2 + r * 0.15 + i * 0.015 }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// The escalation ladder, climbing day by day.
export function LadderVignette() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "-40px" });
  const steps = [["Day 0", "Zone 13 office"], ["Day 3", "Regional Deputy Commissioner"], ["Day 7", "Commissioner, GCC"], ["Day 15", "RTI for the records"]];
  return (
    <div ref={ref} className="flex h-36 flex-col justify-center gap-1.5 rounded-[4px] border border-line bg-bg/40 px-4">
      {steps.map(([d, who], i) => (
        <motion.div key={d} className="flex items-center gap-3 text-[13px]" initial={{ opacity: 0, x: -8 }} animate={seen ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.2 + i * 0.3 }}>
          <span className={`w-12 font-mono text-[11px] ${i === 1 ? "text-accent" : "text-fg-3"}`}>{d}</span>
          <span className={i === 1 ? "font-medium" : "text-fg-2"}>{who}</span>
          {i === 1 && <span className="tag tag-verify ml-auto">Due now</span>}
        </motion.div>
      ))}
    </div>
  );
}

// A record timeline with the step nobody filed: shown as missing, not as failed.
export function GapVignette() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "-40px" });
  const rows = [["12 Jul", "Permission issued, ref GCC/RC/Z8/221", false], ["19 Sep", "Permission period ended", false], ["?", "Completion record not found in the sources checked", true]] as const;
  return (
    <div ref={ref} className="flex h-36 flex-col justify-center gap-2 rounded-[4px] border border-line bg-bg/40 px-4">
      {rows.map(([d, t, gap], i) => (
        <motion.div key={t} className={`flex items-center gap-3 rounded-[3px] px-2 py-1 text-[13px] ${gap ? "border border-dashed border-fg-3/60 text-fg-3" : "text-fg-2"}`}
          initial={{ opacity: 0, y: 6 }} animate={seen ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 + i * 0.35 }}>
          <span className="w-12 font-mono text-[11px]">{d}</span><span>{t}</span>
        </motion.div>
      ))}
    </div>
  );
}
