// The site has one look: the Ink theme, with a light/dark mode switch. Dark is the default.
export type Mode = "dark" | "light";
export const DEFAULT_MODE: Mode = "dark";

// Runs before first paint (inlined in <head>) so there is no flash of the wrong mode.
export const themeBootScript = `try{var v=localStorage.getItem("th-mode");if(v==="dark"||v==="light")document.documentElement.setAttribute("data-mode",v)}catch(e){}`;
