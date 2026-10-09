// Joins class names, skipping falsy values (stand-in for the usual clsx/tailwind-merge helper).
export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
