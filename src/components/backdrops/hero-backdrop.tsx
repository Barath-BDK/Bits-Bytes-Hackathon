"use client";

import { useSyncExternalStore } from "react";
import { DEFAULTS, type ThemeId } from "@/lib/themes";
import { CanvasArt, type CanvasKind } from "@/components/backdrops/canvas-art";
import { BlueprintPlan, DrainagePlan, StreetPlan, TransitPlan, UtilityPlan } from "@/components/backdrops/svg-art";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-mode", "data-backdrop"] });
  return () => obs.disconnect();
}
const attr = (name: string, fallback: string) => () => document.documentElement.getAttribute(name) || fallback;
const readTheme = attr("data-theme", DEFAULTS.theme);
const readMode = attr("data-mode", DEFAULTS.mode);
const readBackdrop = attr("data-backdrop", DEFAULTS.backdrop);

const CANVAS: Partial<Record<ThemeId, CanvasKind>> = { lumora: "water" };
const SVG: Partial<Record<ThemeId, () => React.JSX.Element>> = {
  paper: () => <StreetPlan live />, ink: () => <StreetPlan live />, graphite: () => <StreetPlan live />, midnight: () => <StreetPlan live />, mono: () => <StreetPlan live />, field: () => <StreetPlan />, utilities: UtilityPlan, blueprint: BlueprintPlan, drainage: DrainagePlan, transit: TransitPlan,
};

export const CAPTIONS: Record<ThemeId, string> = {
  paper: "Fig. 1  Street plan, live. Cuts open, get logged, get restored.",
  ink: "Fig. 1  Street plan, live. Cuts open, get logged, get restored.",
  graphite: "Fig. 1  Street plan, live. Cuts open, get logged, get restored.",
  midnight: "Fig. 1  Street plan, live. Cuts open, get logged, get restored.",
  mono: "Fig. 1  Street plan, live. Cuts open, get logged, get restored.",
  utilities: "Fig. 1  Under the road. Five departments, one carriageway.",
  blueprint: "Fig. 1  DWG 14. Junction resurfacing, Zone 13.",
  drainage: "Fig. 1  Storm water network. Where it silts, streets flood.",
  transit: "Fig. 1  Metro works. Phase 2 lines under construction.",
  lumora: "Fig. 1  Monsoon surface. Rain on standing water, Velachery.",
  field: "Fig. 1  Street plan at dusk. Adyar and its lanes.",
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
  const Art = SVG[theme] ?? StreetPlan;
  return (
    <div key={theme} className="art-in absolute inset-0">
      {kind ? <CanvasArt kind={kind} revision={`${theme}-${mode}`} /> : <Art />}
    </div>
  );
}
