import { SITE } from "@/lib/site";

// The brand is a Chennai street-name board: Tamil above, English below, inset border.
export function StreetSign({ size = "md", dark = false }: { size?: "sm" | "md" | "lg"; dark?: boolean }) {
  const s = {
    sm: "px-2 py-1 gap-0.5 [--ta:13px] [--en:7px]",
    md: "px-2.5 py-1.5 gap-0.5 [--ta:16px] [--en:8px]",
    lg: "px-5 py-3 gap-1.5 [--ta:44px] [--en:13px]",
  }[size];
  return (
    <span className={`street-sign inline-flex flex-col items-center leading-none ${dark ? "street-sign-dark" : ""} ${s}`} aria-label={SITE.name}>
      <span className="font-tamil text-[length:var(--ta)] font-semibold" aria-hidden>{SITE.tamil}</span>
      <span className="font-mono text-[length:var(--en)] tracking-[0.32em] pl-[0.32em]" aria-hidden>{SITE.name.toUpperCase()}</span>
    </span>
  );
}
