// A drawing sheet: the card style used across the site. Crop marks and a sheet number instead of a pill box.
// `tone` (a colour) tints the sheet: a soft glow in its corner, a marker in the header and a coloured edge on hover.
export function Sheet({ label, no, tone, className = "", bodyClassName = "", children }: {
  label: string; no?: string; tone?: string; className?: string; bodyClassName?: string; children: React.ReactNode;
}) {
  return (
    <div className={`sheet ${tone ? "sheet-tone" : ""} ${className}`} style={tone ? ({ "--tone": tone } as React.CSSProperties) : undefined}>
      <div className="label flex items-center justify-between border-b border-line px-5 py-2.5 text-fg-3">
        <span className="flex items-center gap-2">{tone && <span aria-hidden className="h-2 w-2 rounded-[2px]" style={{ background: tone }} />}{label}</span>
        {no && <span>Sheet {no}</span>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
