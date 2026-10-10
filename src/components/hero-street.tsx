// The hero's street plan: a generated city drawn in line, where things keep happening. Roads are cut open and
// restored, one road is barricaded with traffic diverted round it, a block loses power, a junction floods.
// Built from seeded noise at module load, so server and client markup match. Colours come from the theme.
import type { CSSProperties } from "react";
import { noise2, rng } from "@/lib/noise";

const H = 900;
const f1 = (n: number) => n.toFixed(1);
const delay = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

const city = (() => {
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
      r();
    }
    locals.push(col);
  }
  const arterials = [
    "M-40 210C380 160 820 320 1650 180", "M-40 760C420 640 900 700 1650 520", "M260 -40C340 300 180 620 380 940",
    "M980 -40C900 260 1120 540 1020 940", "M-40 470C520 430 1080 470 1650 400",
  ];
  return { locals, arterials, river: "M-60 640C300 560 520 720 820 610S1320 420 1660 470", rail: "M-40 330C500 300 1000 360 1650 300" };
})();

const Label = ({ x, y, children, o = 0.5, size = 13, fill = "var(--fg)", anchor = "start" }: {
  x: number; y: number; children: string; o?: number; size?: number; fill?: string; anchor?: "start" | "middle" | "end";
}) => (
  <text x={x} y={y} fontFamily="var(--font-fragment)" fontSize={size} letterSpacing="2.5" fill={fill} opacity={o} textAnchor={anchor}
    stroke="var(--bg)" strokeWidth="14" strokeLinejoin="round" paintOrder="stroke">{children}</text>
);

// Road cuts on local streets in the open part of the plan, clear of the barricade, the dark block and the flood.
const AVOID: [number, number, number][] = [[1040, 360, 120], [1390, 330, 130], [1205, 400, 90]];
const CUTS = (() => {
  const segs = city.locals.flat().map((d) => {
    const [x1, y1, x2, y2] = d.slice(1).split("L").flatMap((pt) => pt.split(" ").map(Number));
    return { d, x: (x1 + x2) / 2, y: (y1 + y2) / 2, a: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI };
  }).filter((g) => g.x > 1060 && g.x < 1450 && g.y > 105 && g.y < 215 && AVOID.every(([x, y, r]) => Math.hypot(g.x - x, g.y - y) > r));
  const picked: typeof segs = [];
  for (const g of segs) if (picked.length < 2 && picked.every((q) => Math.hypot(q.x - g.x, q.y - g.y) > 170)) picked.push(g);
  const notes: [string, string, string][] = [
    ["ROAD CUT  METROWATER", "RESTORED  DAY 14", "var(--fg)"],
    ["ROAD CUT  TELECOM", "NO COMPLETION FILED", "var(--alert)"],
  ];
  return picked.map((g, i) => ({ ...g, note: notes[i][0], done: notes[i][1], tone: notes[i][2], delay: i * 7.5 }));
})();

function RoadCuts() {
  return (
    <g>
      {CUTS.map((c) => {
        const left = c.x > 1180; // keep the note on the sheet
        const lx = left ? c.x - 54 : c.x + 54, ly = c.y + 56;
        return (
          <g key={c.d}>
            <path d={c.d} pathLength={1} className="cut-seg" fill="none" strokeWidth="6" strokeLinecap="round" style={delay(c.delay)} />
            <rect x={c.x - 28} y={c.y - 28} width="56" height="56" fill="none" stroke="var(--works)" strokeWidth="1.6" strokeDasharray="6 5"
              transform={`rotate(${c.a.toFixed(0)} ${c.x.toFixed(0)} ${c.y.toFixed(0)})`} className="cut-box" style={delay(c.delay)} />
            <path d={`M${f1(c.x + (left ? -20 : 20))} ${f1(c.y + 20)}L${f1(lx + (left ? 6 : -6))} ${f1(ly + 8)}H${f1(left ? lx - 180 : lx + 180)}`} pathLength={1}
              fill="none" stroke="var(--fg)" strokeWidth="1" className="cut-lead" style={delay(c.delay)} />
            <g className="cut-note" style={delay(c.delay)}><Label x={lx} y={ly} o={0.95} size={12} anchor={left ? "end" : "start"}>{c.note}</Label></g>
            <g className="cut-done" style={delay(c.delay)}><Label x={lx} y={ly} o={0.95} size={12} fill={c.tone} anchor={left ? "end" : "start"}>{c.done}</Label></g>
          </g>
        );
      })}
    </g>
  );
}

// A barricade across the north-south arterial, with traffic marching round it on a diversion.
function Closure({ id }: { id: string }) {
  return (
    <g>
      <defs>
        <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="12" height="12" fill="var(--bg)" /><rect width="6" height="12" fill="var(--works)" />
        </pattern>
      </defs>
      <path d="M1000 352C1060 344 1112 352 1118 392S1104 470 1046 478" fill="none" stroke="var(--works)" strokeWidth="2.4" strokeDasharray="4 9"
        strokeLinecap="round" className="march" opacity="0.9" />
      <path d="M1052 470l-12 9 14 5" fill="none" stroke="var(--works)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <g transform="rotate(-12 1008 412)">
        <rect x="966" y="404" width="84" height="16" rx="2" fill={`url(#${id})`} stroke="var(--works)" strokeWidth="1.5" />
        <circle cx="972" cy="398" r="4" fill="var(--alert)" className="blink" />
        <circle cx="1044" cy="398" r="4" fill="var(--alert)" className="blink" style={delay(0.6)} />
      </g>
      <Label x={1030} y={302} o={1} size={12} fill="var(--works)">ROAD CLOSED</Label>
      <Label x={1030} y={320} o={0.8} size={11}>DIVERSION 6 DAYS</Label>
    </g>
  );
}

// A block where residents report the power is off: streetlights go out one by one, then the area is outlined.
const LAMPS = [[1352, 296], [1386, 282], [1422, 304], [1360, 340], [1400, 354], [1430, 334], [1378, 380]];
function PowerOff() {
  return (
    <g>
      <circle cx="1390" cy="330" r="74" fill="var(--outage)" className="dark-zone" />
      <circle cx="1390" cy="330" r="74" fill="none" stroke="var(--outage)" strokeWidth="1.5" strokeDasharray="5 6" className="dark-zone-edge" />
      {LAMPS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.2" fill="var(--works)" className="lamp" style={delay(i * 0.35)} />)}
      <g className="dark-note"><Label x={1390} y={428} o={1} size={12} fill="var(--outage)" anchor="middle">POWER OFF</Label><Label x={1390} y={446} o={0.8} size={11} anchor="middle">4 RESIDENTS</Label></g>
    </g>
  );
}

// A junction that floods: ripples spread over standing water.
function Flood() {
  return (
    <g>
      <ellipse cx="1205" cy="398" rx="46" ry="23" fill="var(--water)" opacity="0.22" />
      {[0, 1.2, 2.4].map((d) => <ellipse key={d} cx="1205" cy="398" rx="24" ry="12" fill="none" stroke="var(--water)" strokeWidth="1.5" className="ripple" style={delay(d)} />)}
      <Label x={1205} y={446} o={1} size={12} fill="var(--water)" anchor="middle">WATERLOGGED</Label>
    </g>
  );
}

// Static art and moving parts live in separate stacked SVGs, so an animation only repaints its own layer.
// Wide screens show the plan beside the headline; phones get a closer crop so the labels stay readable.
const VIEW = { wide: "760 70 840 760", phone: "930 80 560 420" };
function Layer({ children, view }: { children: React.ReactNode; view: keyof typeof VIEW }) {
  return (
    <svg viewBox={VIEW[view]} preserveAspectRatio={view === "wide" ? "xMidYMin slice" : "xMidYMid slice"} className="absolute inset-0 h-full w-full" aria-hidden>{children}</svg>
  );
}

function Plan({ view }: { view: keyof typeof VIEW }) {
  return (
    <>
      <Layer view={view}>
        <g fill="none" stroke="var(--fg)" strokeLinecap="round">
          {city.locals.map((col, gx) => (
            <g key={gx} className="etch" style={delay(gx * 0.05)} strokeWidth="1" opacity="0.34">
              {col.map((d, i) => <path key={i} d={d} pathLength={1} />)}
            </g>
          ))}
          <g className="etch" style={delay(0.4)} strokeWidth="2.6" opacity="0.62">
            {city.arterials.map((d) => <path key={d} d={d} pathLength={1} />)}
          </g>
          <path d={city.river} strokeWidth="34" opacity="0.55" />
          <path d={city.river} strokeWidth="29" stroke="var(--bg)" />
          <path d={city.rail} strokeWidth="3" strokeDasharray="2 9" opacity="0.5" />
        </g>
        <Label x={1478} y={226} o={0.45} anchor="end">MG ROAD</Label>
      </Layer>
      <Layer view={view}>
        <Closure id={`hs-hazard-${view}`} />
        <PowerOff />
        <Flood />
        <RoadCuts />
        {[[1310, 150, "var(--pothole)"], [960, 185, "var(--pothole)"]].map(([x, y, c]) => (
          <rect key={String(x)} className="art-blip" x={Number(x) - 7} y={Number(y) - 7} width="14" height="14" rx="3" fill={String(c)} />
        ))}
        <g className="hs-scan" opacity="0.45"><line x1="0" y1="0" x2="0" y2={H} stroke="var(--fg)" strokeWidth="1" strokeDasharray="3 7" /></g>
      </Layer>
    </>
  );
}

export function HeroStreet() {
  return (
    <div className="relative h-64 overflow-hidden sm:h-80 lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[47%]" role="img"
      aria-label="Illustration: a street plan where roads are dug up and restored, one road is closed with a diversion, a block loses power and a junction floods.">
      <div className="absolute inset-0 hidden lg:block"><Plan view="wide" /></div>
      <div className="hs-phone absolute inset-0 lg:hidden"><Plan view="phone" /></div>
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,var(--bg)_0%,transparent_16%),linear-gradient(0deg,var(--bg)_0%,transparent_30%)] max-lg:bg-[linear-gradient(0deg,var(--bg)_0%,transparent_16%)]" aria-hidden />
    </div>
  );
}
