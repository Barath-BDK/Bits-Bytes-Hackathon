import Link from "next/link";

// The way out of a detail page: a real button, big enough to find and tap, with the destination named.
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href}
      className="group inline-flex items-center gap-3 rounded-[10px] border border-line bg-surface/70 py-2 pl-2 pr-5 text-[15px] font-medium text-fg-2 transition hover:border-fg-3 hover:bg-surface hover:text-fg">
      <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-surface-2 text-fg transition-transform duration-300 group-hover:-translate-x-1">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
      </span>
      {children}
    </Link>
  );
}
