import type { Metadata } from "next";
import Link from "next/link";
import { ViewTransition } from "react";
import { Instrument_Sans, Instrument_Serif, Fragment_Mono } from "next/font/google";
import { SmoothScroll } from "@/components/smooth-scroll";
import { ThemeControls } from "@/components/theme-controls";
import { DEFAULTS, themeBootScript } from "@/lib/themes";
import "./globals.css";

const instrument = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-instrument-serif", weight: "400", style: ["normal", "italic"], subsets: ["latin"] });
const fragment = Fragment_Mono({ variable: "--font-fragment", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Gullywatch", template: "%s | Gullywatch" },
  description: "A public ledger of potholes, waterlogging and road works in Chennai. Report once, see who else did, and track it to a fix.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme={DEFAULTS.theme} data-mode={DEFAULTS.mode} data-backdrop={DEFAULTS.backdrop} data-headline={DEFAULTS.headline}
      data-transition={DEFAULTS.transition} suppressHydrationWarning className={`${instrument.variable} ${serif.variable} ${fragment.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <SmoothScroll />
        <header className="sticky top-0 z-40 border-b border-line bg-bg/92 backdrop-blur-sm">
          <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="group flex items-center gap-2.5" aria-label="Gullywatch home">
              <Logo />
              <span className="text-[17px] font-semibold tracking-[-0.03em]">Gullywatch</span>
            </Link>
            <div className="flex items-center gap-1 text-sm">
              <Link href="/map" className="rounded-full px-3 py-1.5 text-fg-2 transition hover:bg-surface-2 hover:text-fg">Map</Link>
              <Link href="/about" className="hidden rounded-full px-3 py-1.5 text-fg-2 transition hover:bg-surface-2 hover:text-fg sm:block">Method</Link>
              <ThemeControls />
              <Link href="/map?report=1" className="ml-1 rounded-full bg-fg px-4 py-1.5 font-medium text-bg transition hover:opacity-85">Report</Link>
            </div>
          </nav>
        </header>
        <ViewTransition default="page">
          <div className="flex flex-1 flex-col">{children}</div>
        </ViewTransition>
      </body>
    </html>
  );
}

// A lane seen from above, with a marker dropping into it.
function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="transition-transform duration-300 group-hover:-rotate-6">
      <rect x="1.5" y="1.5" width="21" height="21" rx="6.5" fill="var(--accent)" />
      <path d="M8 22.5c1.5-6 6.5-9 8-21" stroke="var(--accent-fg)" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
      <circle cx="13.2" cy="10.4" r="2.6" fill="var(--accent-fg)" />
    </svg>
  );
}
