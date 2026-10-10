import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Instrument_Sans, Instrument_Serif, Fragment_Mono } from "next/font/google";
import { SmoothScroll } from "@/components/smooth-scroll";
import { Dock } from "@/components/dock";
import { Chainage, Ground } from "@/components/ground";
import { DEFAULTS, themeBootScript } from "@/lib/themes";
import { SITE } from "@/lib/site";
import "./globals.css";

const instrument = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-instrument-serif", weight: "400", style: ["normal", "italic"], subsets: ["latin"] });
const fragment = Fragment_Mono({ variable: "--font-fragment", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} | ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: "Theru keeps a public record for every street in Chennai: road works, power cuts, water cuts and damage, who answers for them, and what the records leave out.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme={DEFAULTS.theme} data-mode={DEFAULTS.mode} data-backdrop={DEFAULTS.backdrop} data-headline={DEFAULTS.headline}
      data-transition={DEFAULTS.transition} suppressHydrationWarning
      className={`${instrument.variable} ${serif.variable} ${fragment.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <SmoothScroll />
        <Ground />
        <ViewTransition default="page">
          <div className="relative flex flex-1 flex-col pb-20 md:pb-24">
            <Chainage />
            {children}
          </div>
        </ViewTransition>
        <Dock />
      </body>
    </html>
  );
}
