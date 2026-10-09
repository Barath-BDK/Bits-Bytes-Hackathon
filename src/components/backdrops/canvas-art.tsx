"use client";

// Generative canvas backdrops, one per theme. Each runs on requestAnimationFrame, pauses when
// off screen or in a background tab, and draws a single still frame for reduced-motion users.
import { useEffect, useRef } from "react";
import { noise2 } from "@/lib/noise";

type Palette = { bg: string; fg: string; fg3: string; accent: string; pothole: string; water: string; works: string };
type Frame = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, c: Palette) => void;
export type CanvasKind = "water" | "terrain" | "trails" | "ribbons";

function palette(): Palette {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return { bg: v("--bg"), fg: v("--fg"), fg3: v("--fg-3"), accent: v("--accent"), pothole: v("--pothole"), water: v("--water"), works: v("--works") };
}

// Theme tokens are hex; canvas gets plain rgba() so every browser parses it.
function rgbOf(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map((x) => x + x).join("") : h.slice(0, 6);
  const n = parseInt(f, 16);
  return Number.isNaN(n) ? [128, 128, 128] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function withAlpha(color: string, a: number) {
  const [r, g, b] = rgbOf(color);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}
function darken(color: string, keep: number) {
  const [r, g, b] = rgbOf(color);
  return `rgb(${Math.round(r * keep)},${Math.round(g * keep)},${Math.round(b * keep)})`;
}

/* ---------- Lumora: rain falling on standing water ---------- */
function water(): Frame {
  const n = noise2(11);
  const drops: { x: number; y: number; t0: number; s: number }[] = [];
  let next = 0;
  return (ctx, w, h, t, c) => {
    ctx.clearRect(0, 0, w, h);
    if (t > next) {
      drops.push({ x: Math.random() * w, y: h * (0.15 + Math.random() * 0.8), t0: t, s: 0.6 + Math.random() * 0.8 });
      next = t + 0.35 + Math.random() * 0.5;
      if (drops.length > 9) drops.shift();
    }
    const gap = w < 700 ? 18 : 14;
    const step = w < 700 ? 10 : 7;
    ctx.lineWidth = 1;
    for (let y0 = -gap; y0 < h + gap; y0 += gap) {
      ctx.beginPath();
      let energy = 0;
      for (let x = 0; x <= w + step; x += step) {
        let dy = n(x * 0.0035, y0 * 0.012 + t * 0.06) * 12;
        for (const d of drops) {
          const age = t - d.t0;
          const r = Math.hypot(x - d.x, (y0 - d.y) * 1.8);
          const k = r - age * 110 * d.s;
          const env = Math.exp(-(k * k) / 900) * Math.exp(-age * 0.7);
          dy += Math.sin(k * 0.09) * 16 * d.s * env;
          energy += env;
        }
        if (x === 0) ctx.moveTo(x, y0 + dy); else ctx.lineTo(x, y0 + dy);
      }
      const lift = Math.min(1, energy / 40);
      ctx.lineWidth = 1 + lift * 0.8;
      ctx.strokeStyle = withAlpha(lift > 0.05 ? c.accent : c.fg, 0.2 + lift * 0.7);
      ctx.stroke();
    }
    // ring highlights on the surface
    for (const d of drops) {
      const age = t - d.t0;
      const a = Math.max(0, 0.75 - age * 0.22);
      if (a <= 0) continue;
      ctx.strokeStyle = withAlpha(c.accent, a);
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, age * 110 * d.s, age * 110 * d.s * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  };
}

/* ---------- Field: a low flyover of dug-up earth at dusk ---------- */
function terrain(): Frame {
  const n = noise2(23);
  return (ctx, w, h, t, c) => {
    ctx.clearRect(0, 0, w, h);
    const horizon = h * 0.42;
    // low sun and haze
    const sun = ctx.createRadialGradient(w * 0.68, horizon, 0, w * 0.68, horizon, h * 0.55);
    sun.addColorStop(0, withAlpha(c.accent, 0.55));
    sun.addColorStop(0.25, withAlpha(c.pothole, 0.18));
    sun.addColorStop(1, "transparent");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = withAlpha(c.accent, 0.85);
    ctx.beginPath();
    ctx.arc(w * 0.68, horizon - 6, Math.min(w, h) * 0.06, Math.PI, 0);
    ctx.fill();

    const rows = w < 700 ? 34 : 48, cols = w < 700 ? 40 : 70, depth = 1.6;
    const travel = t * 0.9;
    const f = h * 0.9;
    for (let i = rows; i >= 1; i--) {
      const zFrac = (i - (travel % 1)) / rows;
      const z = 0.25 + zFrac * 9;
      const worldZ = Math.floor(travel) + i;
      ctx.beginPath();
      for (let j = 0; j <= cols; j++) {
        const wx = (j / cols - 0.5) * 14;
        // a trench runs down the middle: the road that keeps getting dug up
        const trench = Math.exp(-((wx + Math.sin(worldZ * 0.15) * 1.2) ** 2) / 0.35) * -0.9;
        const hgt = n(wx * 0.35, worldZ * 0.18) * 0.9 + n(wx * 1.2, worldZ * 0.6) * 0.25 + trench;
        const sx = w / 2 + (wx / z) * f * 0.5;
        const sy = horizon + ((depth - hgt * 0.7) / z) * f * 0.28;
        if (j === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.lineTo(w * 4, h * 2);
      ctx.lineTo(-w * 3, h * 2);
      ctx.closePath();
      ctx.fillStyle = c.bg; // painter's algorithm hides the rows behind
      ctx.fill();
      const fog = 1 - zFrac;
      ctx.strokeStyle = withAlpha(i % 6 === 0 ? c.accent : c.fg, 0.08 + fog * 0.42);
      ctx.lineWidth = 0.6 + fog * 0.8;
      ctx.stroke();
    }
  };
}

/* ---------- Bloom: long-exposure traffic on curving lanes ---------- */
function trails(): Frame {
  type Car = { lane: number; s: number; v: number; red: boolean; len: number };
  let lanes: [number, number][][] = [];
  let laneW = 0, laneH = 0;
  const cars: Car[] = [];
  const bez = (p: [number, number][], u: number): [number, number] => {
    const m = 1 - u;
    return [
      m * m * m * p[0][0] + 3 * m * m * u * p[1][0] + 3 * m * u * u * p[2][0] + u * u * u * p[3][0],
      m * m * m * p[0][1] + 3 * m * m * u * p[1][1] + 3 * m * u * u * p[2][1] + u * u * u * p[3][1],
    ];
  };
  return (ctx, w, h, t, c) => {
    if (w !== laneW || h !== laneH) {
      laneW = w; laneH = h;
      lanes = Array.from({ length: 9 }, (_, i) => {
        const o = (i - 4) * h * 0.075;
        return [[-w * 0.1, h * 0.95 + o], [w * 0.3, h * 0.55 + o], [w * 0.6, h * 0.75 + o * 0.4], [w * 1.1, h * 0.12 + o]];
      });
      cars.length = 0;
      for (let k = 0; k < (w < 700 ? 26 : 46); k++) {
        cars.push({ lane: k % lanes.length, s: Math.random(), v: 0.04 + Math.random() * 0.06, red: k % 2 === 0, len: 0.05 + Math.random() * 0.08 });
      }
    }
    ctx.clearRect(0, 0, w, h);
    // faint carriageway with dashed lane markings
    ctx.lineWidth = 1;
    ctx.setLineDash([10, 16]);
    for (const p of lanes) {
      ctx.strokeStyle = withAlpha(c.fg, 0.07);
      ctx.beginPath();
      ctx.moveTo(p[0][0], p[0][1]);
      ctx.bezierCurveTo(p[1][0], p[1][1], p[2][0], p[2][1], p[3][0], p[3][1]);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalCompositeOperation = "lighter";
    for (const car of cars) {
      car.s += car.v * (1 / 60) * (car.red ? 1 : -1);
      if (car.s > 1 + car.len) car.s = -car.len;
      if (car.s < -car.len) car.s = 1 + car.len;
      const p = lanes[car.lane];
      const color = car.red ? c.pothole : c.water;
      const head = car.s, tail = car.s - car.len * (car.red ? 1 : -1);
      const [hx, hy] = bez(p, Math.min(1, Math.max(0, head)));
      const [tx, ty] = bez(p, Math.min(1, Math.max(0, tail)));
      const g = ctx.createLinearGradient(tx, ty, hx, hy);
      g.addColorStop(0, "transparent");
      g.addColorStop(1, color);
      ctx.strokeStyle = g;
      ctx.lineWidth = 2.2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      for (let k = 0; k <= 14; k++) {
        const [x, y] = bez(p, Math.min(1, Math.max(0, tail + (head - tail) * (k / 14))));
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "source-over";
    void t;
  };
}

/* ---------- Velora: red tape, unwinding ---------- */
function ribbons(): Frame {
  const n = noise2(5);
  return (ctx, w, h, t, c) => {
    ctx.clearRect(0, 0, w, h);
    // paper hairlines
    ctx.strokeStyle = withAlpha(c.fg3, 0.12);
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const bands = [
      { base: 0.34, amp: 0.16, k: 0.0042, sp: 0.35, width: 46, phase: 0 },
      { base: 0.62, amp: 0.12, k: 0.0055, sp: -0.28, width: 30, phase: 2.1 },
      { base: 0.82, amp: 0.08, k: 0.0035, sp: 0.22, width: 20, phase: 4.2 },
    ];
    const step = w < 700 ? 8 : 5;
    for (const b of bands) {
      let prev: [number, number, number, number] | null = null;
      for (let x = -20; x <= w + 20; x += step) {
        const cy = h * b.base + Math.sin(x * b.k + t * b.sp + b.phase) * h * b.amp + n(x * 0.002, t * 0.1 + b.phase) * 40;
        const twist = Math.sin(x * 0.006 + t * 0.6 + b.phase);
        const hw = (b.width * (w < 700 ? 0.7 : 1)) * twist;
        const pts: [number, number, number, number] = [x, cy - hw, x, cy + hw];
        if (prev) {
          const shade = Math.abs(twist);
          ctx.fillStyle = darken(c.accent, 0.45 + shade * 0.55);
          ctx.beginPath();
          ctx.moveTo(prev[0], prev[1]); ctx.lineTo(pts[0], pts[1]); ctx.lineTo(pts[2], pts[3]); ctx.lineTo(prev[2], prev[3]);
          ctx.closePath();
          ctx.fill();
        }
        prev = pts;
      }
    }
  };
}

const MAKERS: Record<CanvasKind, () => Frame> = { water, terrain, trails, ribbons };

export function CanvasArt({ kind, revision }: { kind: CanvasKind; revision: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const draw = MAKERS[kind]();
    let colors = palette();
    let w = 0, h = 0, raf = 0, visible = true;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) draw(ctx, w, h, 6, colors);
    };
    const loop = (now: number) => {
      if (visible && !document.hidden) draw(ctx, w, h, (now - start) / 1000, colors);
      raf = requestAnimationFrame(loop);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);
    const mo = new MutationObserver(() => { colors = palette(); if (reduce) draw(ctx, w, h, 6, colors); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-mode"] });
    resize();
    if (!reduce) raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); mo.disconnect(); };
  }, [kind, revision]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}
