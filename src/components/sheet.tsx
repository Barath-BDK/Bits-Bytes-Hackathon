// The card used across the site: a plain bordered panel with a short title row.
export function Sheet({ label, action, className = "", bodyClassName = "", children }: {
  label: string; no?: string; action?: React.ReactNode; className?: string; bodyClassName?: string; children: React.ReactNode;
}) {
  return (
    <div className={`sheet ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h3 className="text-sm font-semibold tracking-[-0.01em] text-fg">{label}</h3>
        {action}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
