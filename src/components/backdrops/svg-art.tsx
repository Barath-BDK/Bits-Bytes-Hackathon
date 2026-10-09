// Line-art backdrops built from seeded noise at module load, so server and client markup match.
// Every map theme draws the same generated city, seen through a different department's drawing.
// Colours come from CSS variables, so they follow the theme without re-rendering.
import type { CSSProperties } from "react";
import { noise2, rng } from "@/lib/noise";

const W = 1600, H = 900;
const f1 = (n: number) => n.toFixed(1);
const delay = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

/* ---------- the shared city ---------- */
const city = (() => {
  const n = noise2(3), r = rng(9);
  const locals: string[][] = [];
  const junctions: [number, number][] = [];
  for (let gx = 0; gx < 21; gx++) {
    const col: string[] = [];
    for (let gy = 0; gy < 12; gy++) {
      if (r() < 0.22) continue;
      const a = n(gx * 0.12, gy * 0.12) * 0.7;
      const cx = gx * 80 + 40 + n(gy, gx) * 14, cy = gy * 80 + 40 + n(gx, gy) * 14;
      const ca = Math.cos(a) * 40, sa = Math.sin(a) * 40;
      col.push(`M${f1(cx - ca)} ${f1(cy - sa)}L${f1(cx + ca)} ${f1(cy + sa)}`);
      if (r() < 0.7) col.push(`M${f1(cx + sa)} ${f1(cy - ca)}L${f1(cx - sa)} ${f1(cy + ca)}`);
      if (r() < 0.35) junctions.push([cx, cy]);
    }
    locals.push(col);
  }
  const arterials = [
    "M-40 210C380 160 820 320 1650 180", "M-40 760C420 640 900 700 1650 520", "M260 -40C340 300 180 620 380 940",
    "M980 -40C900 260 1120 540 1020 940", "M-40 470C520 430 1080 470 1650 400",
  ];
  const river = "M-60 640C300 560 520 720 820 610S1320 420 1660 470";
  const rail = "M-40 330C500 300 1000 360 1650 300";
  return { locals, arterials, river, rail, junctions };
})();

function CityBase({ opacity = 0.28, etch = true, river = true }: { opacity?: number; etch?: boolean; river?: boolean }) {
  return (
    <g fill="none" stroke="var(--fg)" strokeLinecap="round">
      {city.locals.map((col, gx) => (
        <g key={gx} className={`city-col${etch ? " etch" : ""}`} style={delay(gx * 0.06)} strokeWidth="1" opacity={opacity}>
          {col.map((d, i) => <path key={i} d={d} pathLength={1} />)}
        </g>
      ))}
      <g className={etch ? "etch" : undefined} style={delay(0.4)} strokeWidth="2.4" opacity={Math.min(1, opacity * 2)}>
        {city.arterials.map((d) => <path key={d} d={d} pathLength={1} />)}
      </g>
      {river && <>
        <path className={etch ? "etch" : undefined} style={delay(0.9)} d={city.river} pathLength={1} strokeWidth="34" opacity={Math.min(1, opacity * 1.8)} />
        <path d={city.river} strokeWidth="29" stroke="var(--bg)" />
      </>}
    </g>
  );
}

const Label = ({ x, y, children, o = 0.45, size = 13, fill = "var(--fg)" }: { x: number; y: number; children: string; o?: number; size?: number; fill?: string }) => (
  <text x={x} y={y} fontFamily="var(--font-fragment)" fontSize={size} letterSpacing="3" fill={fill} opacity={o}>{children}</text>
);

// Static art and moving parts live in separate stacked SVGs, so an animation only repaints its own small layer.
function Layer({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={`absolute inset-0 h-full w-full ${className}`} aria-hidden>
      {children}
    </svg>
  );
}

/* ---------- Mono: an etched street plan ---------- */
export function StreetPlan() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="art-drift absolute inset-0 h-full w-full" aria-hidden>
      <CityBase />
      <path d={city.rail} fill="none" stroke="var(--fg)" strokeWidth="3" strokeDasharray="2 9" opacity="0.5" />
      <Label x={560} y={672}>ADYAR RIVER</Label>
      <Label x={1120} y={240}>T NAGAR</Label>
      <Label x={240} y={812}>VELACHERY</Label>
      {[[700, 455, "var(--pothole)"], [1010, 395, "var(--water)"], [372, 700, "var(--works)"]].map(([x, y, c]) => (
        <rect key={String(x)} className="art-blip" x={Number(x) - 7} y={Number(y) - 7} width="14" height="14" rx="3" fill={String(c)} />
      ))}
    </svg>
  );
}

/* ---------- Utilities: what lies under the road (dig-safe colour code) ---------- */
const UTIL = [
  { code: "E", name: "POWER", color: "#ff3b30", dy: -9 }, { code: "G", name: "GAS", color: "#ffd23f", dy: -3 },
  { code: "W", name: "WATER", color: "#3d9bff", dy: 3 }, { code: "S", name: "SEWER", color: "#4cd964", dy: 9 },
  { code: "T", name: "TELECOM", color: "#ff8c1a", dy: 15 },
];
const DIGS: [number, number, number, number, string][] = [
  [620, 420, 150, 70, "EXCAVATION  METROWATER"], [1080, 205, 120, 60, "EXCAVATION  TANGEDCO"], [300, 640, 110, 64, "EXCAVATION  CMRL"],
];
export function UtilityPlan() {
  return (
    <div className="art-drift absolute inset-0">
      <Layer className="[will-change:transform]">
        <CityBase opacity={0.14} etch={false} />
        {UTIL.map((u, i) => (
          <g key={u.code} transform={`translate(0 ${u.dy})`} fill="none" stroke={u.color} strokeWidth="2.6" strokeDasharray="16 7" strokeLinecap="round">
            {city.arterials.slice(0, i % 2 ? 5 : 4).map((d, j) => (
              <path key={d} d={d} className="etch" pathLength={1} style={delay(0.2 + i * 0.25 + j * 0.1)} opacity="0.85" />
            ))}
          </g>
        ))}
        {DIGS.map(([x, y, , , t]) => <Label key={t} x={x} y={y - 10} o={0.75} size={11}>{t}</Label>)}
        {UTIL.map((u, i) => (
          <g key={u.name} transform={`translate(${1290} ${640 + i * 30})`}>
            <rect width="26" height="4" y="-2" fill={u.color} />
            <Label x={38} y={5} o={0.75} size={12}>{`${u.code}  ${u.name}`}</Label>
          </g>
        ))}
      </Layer>
      <Layer>
        {DIGS.map(([x, y, w, h, t]) => (
          <rect key={t} x={x} y={y} width={w} height={h} fill="none" stroke="var(--fg)" strokeWidth="2" strokeDasharray="8 6" className="march" />
        ))}
      </Layer>
    </div>
  );
}

/* ---------- Blueprint: a junction resurfacing drawing ---------- */
export function BlueprintPlan() {
  const minor = Array.from({ length: 80 }, (_, i) => i * 20);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <g stroke="var(--fg)" opacity="0.07">{minor.map((v) => <line key={`v${v}`} x1={v} y1="0" x2={v} y2={H} />)}{minor.slice(0, 45).map((v) => <line key={`h${v}`} x1="0" y1={v} x2={W} y2={v} />)}</g>
      <g stroke="var(--fg)" opacity="0.16">{minor.filter((v) => v % 100 === 0).map((v) => <line key={`V${v}`} x1={v} y1="0" x2={v} y2={H} />)}{minor.slice(0, 45).filter((v) => v % 100 === 0).map((v) => <line key={`H${v}`} x1="0" y1={v} x2={W} y2={v} />)}</g>
      <g fill="none" stroke="var(--fg)" strokeLinecap="round">
        {/* carriageways: a crossroads with a slip road */}
        {["M560 -20V900", "M760 -20V900", "M-20 360H1620", "M-20 560H1620"].map((d, i) => <path key={d} d={d} className="etch" pathLength={1} style={delay(i * 0.2)} strokeWidth="2.2" opacity="0.85" />)}
        {["M660 -20V340", "M660 580V900", "M-20 460H540", "M780 460H1620"].map((d, i) => <path key={d} d={d} className="etch" pathLength={1} style={delay(0.8 + i * 0.1)} strokeWidth="1.4" strokeDasharray="22 16" opacity="0.6" />)}
        <path d="M760 360C900 360 940 300 1020 180" className="etch" pathLength={1} style={delay(1.2)} strokeWidth="2" opacity="0.7" />
        {/* zebra crossings */}
        {Array.from({ length: 8 }, (_, i) => <rect key={i} x={572 + i * 23} y="584" width="12" height="44" fill="var(--fg)" stroke="none" opacity="0.5" />)}
        {/* resurfacing patch */}
        <rect x="560" y="360" width="200" height="200" fill="var(--accent)" fillOpacity="0.08" stroke="var(--accent)" strokeDasharray="6 5" className="march" />
      </g>
      {/* dimension lines */}
      <g stroke="var(--accent)" fill="var(--accent)" fontFamily="var(--font-fragment)" fontSize="13">
        <line x1="560" y1="300" x2="760" y2="300" /><path d="M560 300l10-5v10zM760 300l-10-5v10z" stroke="none" />
        <text x="636" y="290" stroke="none">7.50 m</text>
        <line x1="840" y1="360" x2="840" y2="560" /><path d="M840 360l-5 10h10zM840 560l-5-10h10z" stroke="none" />
        <text x="852" y="465" stroke="none">7.50 m</text>
        <text x="575" y="384" stroke="none" fontSize="12">PATCH A  BC 40 mm</text>
      </g>
      {/* pavement cross-section */}
      <g transform="translate(110 610)" fontFamily="var(--font-fragment)" fontSize="12" fill="var(--fg)">
        <text y="-14" opacity="0.8" letterSpacing="2">SECTION A-A</text>
        {[["BC 40", 14, 0.55], ["DBM 60", 20, 0.4], ["WMM 250", 44, 0.25], ["GSB 200", 36, 0.15]].reduce<{ y: number; els: React.ReactNode[] }>((acc, [t, h, o]) => {
          acc.els.push(<g key={String(t)}><rect y={acc.y} width="300" height={Number(h)} fill="var(--fg)" fillOpacity={Number(o)} stroke="var(--fg)" strokeOpacity="0.6" /><text x="312" y={acc.y + Number(h) / 2 + 4} opacity="0.8">{String(t)}</text></g>);
          acc.y += Number(h);
          return acc;
        }, { y: 0, els: [] }).els}
      </g>
      {/* title block */}
      <g transform="translate(1180 690)" fontFamily="var(--font-fragment)" fill="var(--fg)" stroke="var(--fg)">
        <rect width="380" height="150" fill="none" strokeOpacity="0.7" />
        <line x1="0" y1="50" x2="380" y2="50" strokeOpacity="0.5" /><line x1="0" y1="100" x2="380" y2="100" strokeOpacity="0.5" /><line x1="240" y1="100" x2="240" y2="150" strokeOpacity="0.5" />
        <text x="14" y="32" fontSize="14" stroke="none" letterSpacing="2">GCC ROADS DIVISION</text>
        <text x="14" y="82" fontSize="13" stroke="none" opacity="0.8">JUNCTION RESURFACING, ZONE 13</text>
        <text x="14" y="132" fontSize="12" stroke="none" opacity="0.7">DWG 14 OF 22</text>
        <text x="254" y="132" fontSize="12" stroke="none" opacity="0.7">SCALE 1:200</text>
      </g>
      {/* plotter head tracing the kerb */}
      <g>
        <circle r="6" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
        <path d="M-12 0h24M0 -12v24" stroke="var(--accent)" />
        <animateMotion dur="16s" repeatCount="indefinite" path="M560 0V360H-20M-20 560H560V900M760 900V560H1620M1620 360H760V0" />
      </g>
    </svg>
  );
}

/* ---------- Drainage: the storm water network ---------- */
export function DrainagePlan() {
  const branches = city.locals.flatMap((col, i) => (i % 3 === 0 ? col.slice(0, 4) : []));
  return (
    <>
      <Layer className="[will-change:transform]">
        <CityBase opacity={0.12} etch={false} />
        <g fill="none" stroke="var(--water)" strokeLinecap="round">
          {branches.map((d, i) => <path key={i} d={d} strokeWidth="2" opacity="0.5" strokeDasharray="5 13" />)}
          {city.arterials.map((d) => <path key={d} d={d} strokeWidth="4.5" opacity="0.25" />)}
        </g>
        {city.junctions.slice(0, 46).map(([x, y], i) => (
          <g key={i} transform={`translate(${f1(x)} ${f1(y)})`} opacity="0.7">
            <circle r="5" fill="var(--bg)" stroke="var(--fg)" strokeWidth="1.4" />
            <circle r="1.6" fill="var(--fg)" />
          </g>
        ))}
        {[[700, 455], [1010, 395], [372, 700]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d="M-8 -8L8 8M8 -8L-8 8" stroke="var(--alert)" strokeWidth="3" strokeLinecap="round" />
            <Label x={28} y={5} o={0.85} size={11} fill="var(--alert)">SILTED</Label>
          </g>
        ))}
        <Label x={560} y={672}>OUTFALL  ADYAR RIVER</Label>
      </Layer>
      <Layer>
        <g fill="none" stroke="var(--water)" strokeLinecap="round">
          {city.arterials.map((d, i) => <path key={d} d={d} strokeWidth="4.5" opacity="0.85" className="flow flow-fast" style={{ animationDelay: `${i * -0.3}s` }} />)}
        </g>
        {[[700, 455], [1010, 395], [372, 700]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="22" fill="none" stroke="var(--alert)" strokeWidth="2" className="art-blip" />
        ))}
      </Layer>
    </>
  );
}

/* ---------- Transit: a metro works diagram ---------- */
const LINES = [
  { id: "blue", color: "var(--water)", d: "M140 120L560 120L760 320L760 620L1000 860", dashed: false },
  { id: "green", color: "var(--ok)", d: "M80 460L560 460L760 460L1180 460L1460 180", dashed: false },
  { id: "purple", color: "#a77bff", d: "M300 860L300 640L560 380L1100 380L1300 580L1560 580", dashed: true },
];
const STATIONS: [number, number, string, boolean?][] = [
  [140, 120, "AIRPORT"], [560, 120, "ALANDUR"], [760, 320, "GUINDY"], [760, 460, "SAIDAPET", true], [760, 620, "TEYNAMPET"],
  [80, 460, "KOYAMBEDU"], [560, 460, "VADAPALANI", true], [1180, 460, "CENTRAL"], [1460, 180, "WASHERMENPET"],
  [300, 640, "PORUR"], [1100, 380, "MYLAPORE"], [1300, 580, "ADYAR"],
];
export function TransitPlan() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <pattern id="works-stripe" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="14" fill="var(--works)" />
        </pattern>
      </defs>
      <CityBase opacity={0.08} etch={false} river={false} />
      {LINES.map((l, i) => (
        <g key={l.id} fill="none" strokeLinecap="round" strokeLinejoin="round">
          {l.dashed && <path d={l.d} stroke="url(#works-stripe)" strokeWidth="16" opacity="0.5" className="etch" pathLength={1} style={delay(1.2)} />}
          <path d={l.d} stroke={l.color} strokeWidth="9" strokeDasharray={l.dashed ? "18 12" : undefined} className={l.dashed ? undefined : "etch"} pathLength={l.dashed ? undefined : 1} style={delay(i * 0.35)} />
        </g>
      ))}
      {LINES.filter((l) => !l.dashed).map((l, i) => (
        <rect key={l.id} x="-13" y="-6" width="26" height="12" rx="6" fill="var(--fg)" stroke="var(--bg)" strokeWidth="2">
          <animateMotion dur={`${14 + i * 5}s`} begin={`${2 + i}s`} repeatCount="indefinite" path={l.d} rotate="auto" />
        </rect>
      ))}
      {STATIONS.map(([x, y, name, interchange]) => (
        <g key={name} transform={`translate(${x} ${y})`}>
          {interchange && <circle r="15" fill="var(--bg)" stroke="var(--fg)" strokeWidth="3" />}
          <circle r="8" fill="var(--bg)" stroke="var(--fg)" strokeWidth="3" />
          <Label x={16} y={-14} o={0.8} size={12}>{name}</Label>
        </g>
      ))}
      <g transform="translate(1180 760)">
        <rect width="34" height="12" y="-6" fill="url(#works-stripe)" />
        <Label x={46} y={5} o={0.8} size={12}>PHASE 2  UNDER CONSTRUCTION</Label>
      </g>
    </svg>
  );
}
