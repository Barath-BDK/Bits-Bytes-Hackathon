import "server-only";

// Hourly rain for the next three days from Open-Meteo (free, no key). Cached for 30 minutes per ~1 km cell.
export type RainHour = { time: string; mm: number; chance: number };

export async function rainForecast(lat: number, lng: number): Promise<RainHour[] | null> {
  const q = new URLSearchParams({
    latitude: lat.toFixed(2), longitude: lng.toFixed(2), hourly: "precipitation,precipitation_probability",
    forecast_days: "3", timezone: "Asia/Kolkata",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(4000) }).catch(() => null);
  if (!res?.ok) return null;
  const body = (await res.json()) as { hourly?: { time: string[]; precipitation: number[]; precipitation_probability: (number | null)[] } };
  const h = body.hourly;
  if (!h) return null;
  // Open-Meteo returns local times without an offset; pin them to IST.
  return h.time.map((t, i) => ({ time: `${t}:00+05:30`, mm: h.precipitation[i] ?? 0, chance: h.precipitation_probability[i] ?? 0 }));
}

// Transparent waterlogging rule: heavy rain anywhere, or moderate rain where waterlogging has been reported before.
export function waterloggingRisk(mm: number, history: number): "high" | "moderate" | "low" {
  if (mm >= 7.5 || (mm >= 2.5 && history > 0)) return "high";
  if (mm >= 2.5 || (mm >= 0.5 && history > 0)) return "moderate";
  return "low";
}
