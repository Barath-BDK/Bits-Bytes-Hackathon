import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Archivo, Instrument_Sans, Instrument_Serif, Fragment_Mono } from "next/font/google";
import { SmoothScroll } from "@/components/smooth-scroll";
import { SiteHeader } from "@/components/site-header";
import { ScrollProgress } from "@/components/scroll-progress";
import { DEFAULT_MODE, themeBootScript } from "@/lib/themes";
import { SITE } from "@/lib/site";
import "./globals.css";

const instrument = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-instrument-serif", weight: "400", style: ["normal", "italic"], subsets: ["latin"] });
// Archivo (variable width) for headings and figures: set wide and heavy, like lettering on a road sign
const archivo = Archivo({ variable: "--font-display", subsets: ["latin"], axes: ["wdth"] });
const fragment = Fragment_Mono({ variable: "--font-fragment", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} | ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: "Theru keeps a public record for every street: road works, power and water cuts, damage, residents' requests, who answers for them, and what the records leave out. Running live in Chennai.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-mode={DEFAULT_MODE} suppressHydrationWarning
      className={`${instrument.variable} ${serif.variable} ${fragment.variable} ${archivo.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <SmoothScroll />
        <ScrollProgress />
        <SiteHeader />
        <ViewTransition default="page">
          <div className="relative flex flex-1 flex-col">
            {children}
          </div>
        </ViewTransition>
      </body>
    </html>
  );
}
