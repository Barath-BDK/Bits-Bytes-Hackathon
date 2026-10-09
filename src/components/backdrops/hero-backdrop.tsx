"use client";

import { useSyncExternalStore } from "react";
import { DEFAULTS, type ThemeId } from "@/lib/themes";
import { CanvasArt, type CanvasKind } from "@/components/backdrops/canvas-art";
import { StreetPlan, SurveySheet } from "@/components/backdrops/svg-art";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-mode", "data-backdrop"] });
  return () => obs.disconnect();
}
const attr = (name: string, fallback: string) => () => document.documentElement.getAttribute(name) || fallback;
const readTheme = attr("data-theme", DEFAULTS.theme);
const readMode = attr("data-mode", DEFAULTS.mode);
const readBackdrop = attr("data-backdrop", DEFAULTS.backdrop);

const CANVAS: Partial<Record<ThemeId, CanvasKind>> = { lumora: "water", field: "terrain", bloom: "trails", velora: "ribbons" };

export const CAPTIONS: Record<ThemeId, string> = {
  lumora: "Fig. 1  Monsoon surface. Rain on standing water, Velachery.",
  field: "Fig. 1  Earthworks. A road that keeps getting dug up, at dusk.",
  bloom: "Fig. 1  Night traffic. Long exposure on a diverted carriageway.",
  mono: "Fig. 1  Street plan, etched. Adyar and its lanes.",
  velora: "Fig. 1  Red tape, unwinding.",
  atlas: "Fig. 1  Survey sheet. Chennai, 13°N 80°E.",
};

export function useThemeId() {
  return useSyncExternalStore(subscribe, readTheme, () => DEFAULTS.theme) as ThemeId;
}

export function HeroBackdrop() {
  const theme = useThemeId();
  const mode = useSyncExternalStore(subscribe, readMode, () => DEFAULTS.mode);
  const backdrop = useSyncExternalStore(subscribe, readBackdrop, () => DEFAULTS.backdrop);

  if (backdrop === "off") return null;
  if (backdrop === "grid") return <div className="hairline-grid absolute inset-0" />;
  const kind = CANVAS[theme];
  return (
    <div key={theme} className="art-in absolute inset-0">
      {kind ? <CanvasArt kind={kind} revision={`${theme}-${mode}`} /> : theme === "mono" ? <StreetPlan /> : <SurveySheet />}
    </div>
  );
}
