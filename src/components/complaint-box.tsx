"use client";

import { useState } from "react";

export function ComplaintBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-rule">
      <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap bg-paper-2 p-4 font-mono text-[0.72rem] leading-relaxed" data-lenis-prevent>{text}</pre>
      <button
        onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="w-full border-t border-rule bg-ink py-2.5 text-sm font-medium text-paper hover:opacity-90"
      >
        {copied ? "Copied" : "Copy complaint"}
      </button>
    </div>
  );
}
