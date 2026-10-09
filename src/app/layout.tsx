import type { Metadata } from "next";
import Link from "next/link";
import { Gloock, Atkinson_Hyperlegible_Next, Martian_Mono } from "next/font/google";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";

const gloock = Gloock({ variable: "--font-gloock", weight: "400", subsets: ["latin"] });
const atkinson = Atkinson_Hyperlegible_Next({ variable: "--font-atkinson", subsets: ["latin"] });
const martian = Martian_Mono({ variable: "--font-martian", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Gullywatch", template: "%s · Gullywatch" },
  description: "A public ledger of potholes, waterlogging and road works in Chennai. Report once, see who else did, and track it to a fix.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${gloock.variable} ${atkinson.variable} ${martian.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SmoothScroll />
        <header className="sticky top-0 z-40 border-b border-rule bg-paper/85 backdrop-blur-md">
          <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5" aria-label="Gullywatch home">
              <span className="stripes block h-4 w-4 rounded-[3px]" aria-hidden />
              <span className="font-display text-2xl leading-none">Gullywatch</span>
            </Link>
            <div className="flex items-center gap-1 text-sm sm:gap-2">
              <Link href="/map" className="rounded-full px-3 py-1.5 hover:bg-paper-2">Map</Link>
              <Link href="/about" className="hidden rounded-full px-3 py-1.5 hover:bg-paper-2 sm:block">How it works</Link>
              <Link href="/map?report=1" className="rounded-full bg-ink px-4 py-1.5 font-medium text-paper hover:opacity-90">
                Report
              </Link>
            </div>
          </nav>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
