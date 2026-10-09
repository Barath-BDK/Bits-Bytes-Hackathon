"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export function ComplaintBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
      <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap p-4 font-mono text-[12px] leading-relaxed text-fg-2" data-lenis-prevent>{text}</pre>
      <button
        onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
        className="relative w-full overflow-hidden border-t border-line bg-fg py-3 text-sm font-medium text-bg transition hover:opacity-85"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={String(copied)} className="block" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.18 }}>
            {copied ? "Copied to clipboard" : "Copy complaint"}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
}
