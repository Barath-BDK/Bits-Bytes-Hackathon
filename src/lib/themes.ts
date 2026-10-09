// Palettes, each paired with a backdrop drawn from the city's own infrastructure. Keep ids in sync with globals.css.
export const THEMES = [
  { id: "mono", name: "Mono", note: "Etched street plan", swatch: ["#031211", "#e8e4d3", "#75736a"] },
  { id: "utilities", name: "Utilities", note: "What lies under the road", swatch: ["#111214", "#ff7a1a", "#ffd23f"] },
  { id: "blueprint", name: "Blueprint", note: "Resurfacing drawing", swatch: ["#0a2342", "#e4efff", "#7fd1ff"] },
  { id: "drainage", name: "Drainage", note: "Storm water network", swatch: ["#07141b", "#3fb6ff", "#dfe9ee"] },
  { id: "transit", name: "Transit", note: "Metro works diagram", swatch: ["#0e0f11", "#3aa8ff", "#3ccf7a"] },
  { id: "lumora", name: "Lumora", note: "Monsoon surface", swatch: ["#031211", "#e8e4d3", "#00aebb"] },
  { id: "field", name: "Field", note: "Earthworks at dusk", swatch: ["#090907", "#6c5636", "#b89d73"] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export type Mode = "dark" | "light";

// Trial settings while we decide on the final look. Each maps to a data-* attribute on <html>.
export const SETTINGS = {
  backdrop: { label: "Background", options: [["art", "Theme art"], ["grid", "Grid"], ["off", "Plain"]] },
  headline: { label: "Headline", options: [["serif", "Serif accent"], ["gradient", "Gradient"], ["tinted", "Tinted"]] },
  transition: { label: "Page transition", options: [["blur", "Blur"], ["slide", "Slide"], ["wipe", "Wipe"], ["circle", "Circle"], ["zoom", "Zoom"], ["none", "None"]] },
  switch: { label: "Theme switch", options: [["auto", "Match theme"], ["etch", "Street grid"], ["lanes", "Lanes"], ["sweep", "Sweep"], ["ripple", "Ripple"], ["horizon", "Horizon"], ["blocks", "Blocks"], ["circle", "Circle"], ["fade", "Fade"]] },
} as const;
export type SettingKey = keyof typeof SETTINGS;

// Theme switch style used by "Match theme".
export const SWITCH_FOR: Record<ThemeId, string> = {
  mono: "etch", utilities: "lanes", blueprint: "sweep", drainage: "ripple", transit: "lanes", lumora: "ripple", field: "horizon",
};

export const DEFAULTS = { theme: "mono", mode: "dark", backdrop: "art", headline: "serif", transition: "blur", switch: "auto" } as const;
export const DEFAULT_THEME: ThemeId = DEFAULTS.theme;
export const DEFAULT_MODE: Mode = DEFAULTS.mode;

const allowed: Record<string, readonly string[]> = {
  theme: THEMES.map((t) => t.id),
  mode: ["dark", "light"],
  ...Object.fromEntries(Object.entries(SETTINGS).map(([k, v]) => [k, v.options.map((o) => o[0])])),
};

// Runs before first paint (inlined in <head>) so there is no flash of the wrong look.
export const themeBootScript = `try{var A=${JSON.stringify(allowed)},D=${JSON.stringify(DEFAULTS)},d=document.documentElement;for(var k in D){var v=localStorage.getItem("gw-"+k);d.setAttribute("data-"+k,A[k].indexOf(v)>=0?v:D[k])}}catch(e){}`;
