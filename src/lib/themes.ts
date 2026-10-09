// Palettes from the reference boards. Keep ids in sync with globals.css.
export const THEMES = [
  { id: "lumora", name: "Lumora", note: "Monsoon surface", swatch: ["#031211", "#e8e4d3", "#00aebb"] },
  { id: "field", name: "Field", note: "Earthworks at dusk", swatch: ["#090907", "#6c5636", "#b89d73"] },
  { id: "bloom", name: "Bloom", note: "Night traffic", swatch: ["#021881", "#255dce", "#de1110"] },
  { id: "mono", name: "Mono", note: "Etched street plan", swatch: ["#031211", "#e8e4d3", "#75736a"] },
  { id: "velora", name: "Velora", note: "Red tape", swatch: ["#181e4a", "#afaea2", "#c21319"] },
  { id: "atlas", name: "Atlas", note: "Survey sheet", swatch: ["#ebe6d2", "#b8945a", "#0e1d61"] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export type Mode = "dark" | "light";

// Trial settings while we decide on the final look. Each maps to a data-* attribute on <html>.
export const SETTINGS = {
  backdrop: { label: "Background", options: [["art", "Theme art"], ["grid", "Grid"], ["off", "Plain"]] },
  headline: { label: "Headline", options: [["serif", "Serif accent"], ["gradient", "Gradient"], ["tinted", "Tinted"]] },
  transition: { label: "Page transition", options: [["blur", "Blur"], ["slide", "Slide"], ["wipe", "Wipe"], ["circle", "Circle"], ["zoom", "Zoom"], ["none", "None"]] },
} as const;
export type SettingKey = keyof typeof SETTINGS;

export const DEFAULTS = { theme: "lumora", mode: "dark", backdrop: "art", headline: "serif", transition: "blur" } as const;
export const DEFAULT_THEME: ThemeId = DEFAULTS.theme;
export const DEFAULT_MODE: Mode = DEFAULTS.mode;

const allowed: Record<string, readonly string[]> = {
  theme: THEMES.map((t) => t.id),
  mode: ["dark", "light"],
  ...Object.fromEntries(Object.entries(SETTINGS).map(([k, v]) => [k, v.options.map((o) => o[0])])),
};

// Runs before first paint (inlined in <head>) so there is no flash of the wrong look.
export const themeBootScript = `try{var A=${JSON.stringify(allowed)},D=${JSON.stringify(DEFAULTS)},d=document.documentElement;for(var k in D){var v=localStorage.getItem("gw-"+k);d.setAttribute("data-"+k,A[k].indexOf(v)>=0?v:D[k])}}catch(e){}`;
