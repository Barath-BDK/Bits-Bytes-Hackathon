// Seeded PRNG + 2D gradient noise. Deterministic, so SVG art renders identically on server and client.

export function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function noise2(seed = 7) {
  const rand = rng(seed);
  const perm = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const p = new Uint8Array(512).map((_, i) => perm[i & 255]);
  const grad = (h: number, x: number, y: number) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const X = xi & 255, Y = yi & 255;
    const xf = x - xi, yf = y - yi;
    const u = fade(xf), v = fade(yf);
    const a = p[X] + Y, b = p[X + 1] + Y;
    const l1 = grad(p[a], xf, yf) + u * (grad(p[b], xf - 1, yf) - grad(p[a], xf, yf));
    const l2 = grad(p[a + 1], xf, yf - 1) + u * (grad(p[b + 1], xf - 1, yf - 1) - grad(p[a + 1], xf, yf - 1));
    return (l1 + v * (l2 - l1)) * 0.7; // roughly -1..1
  };
}
