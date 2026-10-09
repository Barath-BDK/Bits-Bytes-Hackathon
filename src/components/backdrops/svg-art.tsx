// Line-art backdrops built from seeded noise at module load, so server and client markup match.
// Colours come from CSS variables, so they follow the theme without re-rendering.
import { noise2, rng } from "@/lib/noise";

const W = 1600, H = 900;
const f1 = (n: number) => n.toFixed(1);

/* ---------- Mono: an etched street plan ---------- */
const street = (() => {
  const n = noise2(3), r = rng(9);
  const locals: string[][] = [];
  for (let gx = 0; gx < 21; gx++) {
    const col: string[] = [];
    for (let gy = 0; gy < 12; gy++) {
      if (r() < 0.22) continue;
      const a = n(gx * 0.12, gy * 0.12) * 0.7;
      const cx = gx * 80 + 40 + n(gy, gx) * 14, cy = gy * 80 + 40 + n(gx, gy) * 14;
      const ca = Math.cos(a) * 40, sa = Math.sin(a) * 40;
      col.push(`M${f1(cx - ca)} ${f1(cy - sa)}L${f1(cx + ca)} ${f1(cy + sa)}`);
      if (r() < 0.7) col.push(`M${f1(cx + sa)} ${f1(cy - ca)}L${f1(cx - sa)} ${f1(cy + ca)}`);
    }
    locals.push(col);
  }
  const arterials = [
    "M-40 210C380 160 820 320 1650 180", "M-40 760C420 640 900 700 1650 520", "M260 -40C340 300 180 620 380 940",
    "M980 -40C900 260 1120 540 1020 940", "M-40 470C520 430 1080 470 1650 400",
  ];
  const river = "M-60 640C300 560 520 720 820 610S1320 420 1660 470";
  return { locals, arterials, river };
})();

export function StreetPlan() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="art-drift absolute inset-0 h-full w-full" aria-hidden>
      <g fill="none" stroke="var(--fg)" strokeLinecap="round">
        {street.locals.map((col, gx) => (
          <g key={gx} className="etch" style={{ "--d": `${gx * 0.07}s` } as React.CSSProperties} strokeWidth="1" opacity="0.28">
            {col.map((d, i) => <path key={i} d={d} pathLength={1} />)}
          </g>
        ))}
        <g className="etch" style={{ "--d": "0.4s" } as React.CSSProperties} strokeWidth="2.4" opacity="0.55">
          {street.arterials.map((d) => <path key={d} d={d} pathLength={1} />)}
        </g>
        <path className="etch" style={{ "--d": "0.9s" } as React.CSSProperties} d={street.river} pathLength={1} strokeWidth="34" opacity="0.5" />
        <path d={street.river} strokeWidth="29" stroke="var(--bg)" />
        <path d="M-40 330C500 300 1000 360 1650 300" strokeWidth="3" strokeDasharray="2 9" opacity="0.5" />
      </g>
      <g fontFamily="var(--font-fragment)" fontSize="13" letterSpacing="3" fill="var(--fg)" opacity="0.45">
        <text x="560" y="672">ADYAR RIVER</text>
        <text x="1120" y="240">T NAGAR</text>
        <text x="240" y="812">VELACHERY</text>
      </g>
      {[[700, 455, "var(--pothole)"], [1010, 395, "var(--water)"], [372, 700, "var(--works)"]].map(([x, y, c]) => (
        <rect key={String(x)} className="art-blip" x={Number(x) - 7} y={Number(y) - 7} width="14" height="14" rx="3" fill={String(c)} />
      ))}
    </svg>
  );
}

/* ---------- Atlas: a survey sheet ---------- */
const survey = (() => {
  const n = noise2(17);
  const ring = (cx: number, cy: number, k: number, base: number, gain: number) => {
    let d = "";
    for (let i = 0; i <= 72; i++) {
      const th = (i / 72) * Math.PI * 2;
      const rr = base + k * gain + n(Math.cos(th) * 1.3 + k * 0.07, Math.sin(th) * 1.3 + k * 0.05) * k * 8;
      d += `${i ? "L" : "M"}${f1(cx + Math.cos(th) * rr * 1.25)} ${f1(cy + Math.sin(th) * rr)}`;
    }
    return d + "Z";
  };
  const hill = Array.from({ length: 14 }, (_, k) => ring(1040, 470, k + 1, 30, 24));
  const knoll = Array.from({ length: 7 }, (_, k) => ring(330, 250, k + 1, 18, 20));
  let coast = "M1460 -20";
  for (let y = 0; y <= 920; y += 20) coast += `L${f1(1460 + n(y * 0.02, 3) * 40 + Math.sin(y * 0.004) * 30)} ${y}`;
  return { hill, knoll, coast };
})();

export function SurveySheet() {
  const grid = Array.from({ length: 16 }, (_, i) => i * 100 + 50);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <g stroke="var(--works)" strokeWidth="1" strokeDasharray="3 7" opacity="0.4">
        {grid.map((x) => <line key={`x${x}`} x1={x} y1="0" x2={x} y2={H} />)}
        {grid.slice(0, 9).map((y) => <line key={`y${y}`} x1="0" y1={y} x2={W} y2={y} />)}
      </g>
      <g fontFamily="var(--font-fragment)" fontSize="11" fill="var(--works)" opacity="0.75">
        {grid.slice(1, 15).map((x, i) => <text key={x} x={x + 4} y="18">80°{String(10 + i).padStart(2, "0")}′E</text>)}
        {grid.slice(1, 9).map((y, i) => <text key={y} x="6" y={y - 4}>13°{String(8 - i).padStart(2, "0")}′N</text>)}
      </g>
      <g fill="none" stroke="var(--fg)" strokeLinejoin="round">
        {[...survey.hill, ...survey.knoll].map((d, i) => (
          <path key={i} d={d} pathLength={1} className="etch" style={{ "--d": `${(i % 14) * 0.08}s` } as React.CSSProperties}
            strokeWidth={i % 5 === 4 ? 1.8 : 0.9} opacity={i % 5 === 4 ? 0.65 : 0.3} stroke={i % 5 === 4 ? "var(--works)" : "var(--fg)"} />
        ))}
        <path d={survey.coast} strokeWidth="1.6" opacity="0.6" className="etch" pathLength={1} style={{ "--d": "0.6s" } as React.CSSProperties} />
        <path d="M120 860C380 760 520 640 760 600S1080 560 1300 380" stroke="var(--accent)" strokeWidth="2" strokeDasharray="10 8" opacity="0.8" />
      </g>
      {[[760, 600, "BM 12.4"], [1040, 470, "TRIG 48"], [1300, 380, "BM 9.1"]].map(([x, y, t]) => (
        <g key={String(t)} transform={`translate(${x} ${y})`}>
          <path d="M0 -9L8 6H-8Z" fill="var(--accent)" />
          <text x="12" y="4" fontFamily="var(--font-fragment)" fontSize="12" fill="var(--fg)" opacity="0.7">{t}</text>
        </g>
      ))}
      <g transform="translate(170 730)" opacity="0.7">
        <g className="art-spin">
          <circle r="62" fill="none" stroke="var(--fg)" strokeWidth="1" />
          <circle r="48" fill="none" stroke="var(--works)" strokeWidth="1" strokeDasharray="2 4" />
          {Array.from({ length: 32 }, (_, i) => (
            <line key={i} x1="0" y1={i % 8 === 0 ? -62 : -56} x2="0" y2="-48" stroke="var(--fg)" strokeWidth={i % 8 === 0 ? 1.6 : 0.8} transform={`rotate(${i * 11.25})`} />
          ))}
        </g>
        <path d="M0 -44L7 0L0 44L-7 0Z" fill="var(--works)" />
        <path d="M0 -44L7 0H-7Z" fill="var(--fg)" />
        <text y="-70" textAnchor="middle" fontFamily="var(--font-fragment)" fontSize="13" fill="var(--fg)">N</text>
      </g>
      <rect className="art-scan" x="0" y="0" width="2" height={H} fill="var(--works)" opacity="0.5" />
    </svg>
  );
}
