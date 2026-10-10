// A drawing sheet: the card style used across the site. Crop marks and a sheet number instead of a pill box.
export function Sheet({ label, no, className = "", bodyClassName = "", children }: {
  label: string; no?: string; className?: string; bodyClassName?: string; children: React.ReactNode;
}) {
  return (
    <div className={`sheet ${className}`}>
      <div className="label flex items-center justify-between border-b border-line px-5 py-2.5 text-fg-3">
        <span>{label}</span>
        {no && <span>Sheet {no}</span>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
