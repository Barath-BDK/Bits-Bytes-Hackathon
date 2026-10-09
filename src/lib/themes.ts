// Palettes from the reference boards. Keep ids in sync with globals.css.
export const THEMES = [
  { id: "lumora", name: "Lumora", note: "Ink, ivory, electric teal", swatch: ["#031211", "#e8e4d3", "#00aebb"] },
  { id: "field", name: "Field", note: "Charcoal, earth, burnt amber", swatch: ["#090907", "#6c5636", "#b89d73"] },
  { id: "bloom", name: "Bloom", note: "Midnight, cobalt, signal red", swatch: ["#021881", "#255dce", "#de1110"] },
  { id: "mono", name: "Mono", note: "Ink and ivory only", swatch: ["#031211", "#e8e4d3", "#75736a"] },
  { id: "velora", name: "Velora", note: "Navy, stone, crimson", swatch: ["#181e4a", "#afaea2", "#c21319"] },
  { id: "atlas", name: "Atlas", note: "Ivory, gold, deep navy", swatch: ["#ebe6d2", "#b8945a", "#0e1d61"] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export type Mode = "dark" | "light";

export const DEFAULT_THEME: ThemeId = "lumora";
export const DEFAULT_MODE: Mode = "dark";

// Runs before first paint (inlined in <head>) so there is no flash of the wrong theme.
export const themeBootScript = `try{var t=localStorage.getItem("gw-theme"),m=localStorage.getItem("gw-mode"),d=document.documentElement;d.dataset.theme=${JSON.stringify(
  THEMES.map((t) => t.id),
)}.includes(t)?t:"${DEFAULT_THEME}";d.dataset.mode=m==="light"||m==="dark"?m:"${DEFAULT_MODE}"}catch(e){}`;
