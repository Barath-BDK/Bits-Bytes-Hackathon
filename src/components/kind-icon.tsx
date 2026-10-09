import type { Kind } from "@/lib/issues";

// Hand-drawn 24px glyphs: a cracked crater, a flooded street, a traffic cone, a broken bolt.
const PATHS: Record<Kind, string> = {
  pothole:
    '<path d="M4 15.5c0-2.3 3.6-4.2 8-4.2s8 1.9 8 4.2-3.6 4.2-8 4.2-8-1.9-8-4.2z"/><path d="M7.5 15.5c.8 1 2.5 1.6 4.5 1.6"/><path d="M12 11.3 10.6 8l2-2.2L11.4 3"/><path d="m17.4 12.3 2.1-2.6"/><path d="M6.4 12.2 4 9.8"/>',
  waterlogging:
    '<path d="M12 2.8s-3.6 4-3.6 6.4a3.6 3.6 0 0 0 7.2 0c0-2.4-3.6-6.4-3.6-6.4z"/><path d="M2.5 16.5c1.6 0 1.6-1.3 3.2-1.3s1.6 1.3 3.2 1.3 1.6-1.3 3.1-1.3 1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3 1.6 1.3 3.1 1.3"/><path d="M2.5 20.5c1.6 0 1.6-1.3 3.2-1.3s1.6 1.3 3.2 1.3 1.6-1.3 3.1-1.3 1.6 1.3 3.2 1.3 1.6-1.3 3.2-1.3 1.6 1.3 3.1 1.3"/>',
  worksite:
    '<path d="M10 3.5h4l4.2 14.5H5.8z"/><path d="M8.4 9h7.2"/><path d="M7 13.6h10"/><path d="M3.5 18h17v2.5h-17z"/>',
  // a bolt with a break through it: the power is off
  outage: '<path d="M13.5 2.5 5 13.2h6l-1 8.3 8.6-11h-6.1z"/><path d="M3 3.5l18 17"/>',
};

const BADGE: Record<Kind, [string, string]> = {
  pothole: ["var(--pothole)", "#fff"], waterlogging: ["var(--water)", "#fff"], worksite: ["var(--works)", "#18160f"], outage: ["var(--outage)", "#fff"],
};

export function kindIconSvg(kind: Kind, size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[kind]}</svg>`;
}

export function KindIcon({ kind, size = 16, className }: { kind: Kind; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}
      dangerouslySetInnerHTML={{ __html: PATHS[kind] }} />
  );
}

// Coloured tile used in lists and headers.
export function KindBadge({ kind, size = 30 }: { kind: Kind; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-[9px]"
      style={{ width: size, height: size, background: BADGE[kind][0], color: BADGE[kind][1] }}>
      <KindIcon kind={kind} size={Math.round(size * 0.58)} />
    </span>
  );
}
