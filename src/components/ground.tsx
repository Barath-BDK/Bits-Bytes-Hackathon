// The page ground: what sits behind every page below the hero. A survey sheet (registration crosses and
// contour lines, every fifth one an index contour in the theme's accent) fixed behind the content, and a
// chainage ruler down the left margin that scrolls past like distance marks along a road drawing.
// Static SVG generated once at module load, so it costs nothing per frame.
import { noise2 } from "@/lib/noise";

const W = 1600, H = 1000;
const contours = (() => {
  const n = noise2(21);
  return Array.from({ length: 16 }, (_, i) => {
    const base = 40 + i * 62;
    const pts = Array.from({ length: 41 }, (_, k) => {
      const x = k * 40;
      const y = base + n(k * 0.09, i * 0.35) * 70 + n(k * 0.03 + 9, i * 0.1) * 60;
      return `${x.toFixed(0)} ${y.toFixed(1)}`;
    });
    return { d: `M${pts.join("L")}`, index: i % 5 === 2 };
  });
})();
const crosses = Array.from({ length: 10 }, (_, gx) => Array.from({ length: 6 }, (_, gy) => [100 + gx * 160, 100 + gy * 160])).flat();

export function Ground() {
  return (
    <div className="ground" aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <g fill="none" strokeLinejoin="round">
          {contours.map((c) => (
            <path key={c.d} d={c.d} stroke={c.index ? "var(--accent)" : "var(--fg)"} strokeWidth={c.index ? 1.6 : 1} />
          ))}
        </g>
        <g stroke="var(--fg)" strokeWidth="1.2">
          {crosses.map(([x, y]) => <path key={`${x}-${y}`} d={`M${x - 7} ${y}h14M${x} ${y - 7}v14`} />)}
        </g>
      </svg>
    </div>
  );
}

const MARKS = Array.from({ length: 90 }, (_, i) => i);
export function Chainage() {
  return (
    <div className="chainage hidden xl:block" aria-hidden>
      {MARKS.map((i) => {
        const m = (i + 1) * 200; // one major tick per 200 px, read as metres along the road
        return <span key={i} style={{ top: m }}>{`CH ${Math.floor(m / 1000)}+${String(m % 1000).padStart(3, "0")}`}</span>;
      })}
    </div>
  );
}
