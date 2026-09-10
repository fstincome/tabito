export type WeatherDay = {
  date: string;
  code: number;
  max: number;
  min: number;
  rain: number;
};

export type WeatherNow = {
  temperature: number;
  apparent: number;
  humidity: number | null;
  wind: number;
  rain: number;
  code: number;
  label: string;
  icon: string;
  isDay: boolean;
  daily: WeatherDay[];
  fetchedAt: number;
};

const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; data: WeatherNow }>();

const CODES: Record<number, [string, string]> = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Dense drizzle", "🌦️"],
  61: ["Light rain", "🌧️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"],
  67: ["Freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"],
  73: ["Snow", "🌨️"],
  75: ["Heavy snow", "🌨️"],
  80: ["Rain showers", "🌦️"],
  81: ["Rain showers", "🌦️"],
  82: ["Violent showers", "⛈️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm, hail", "⛈️"],
  99: ["Thunderstorm, hail", "⛈️"],
};

export function describeWeather(code: number): { label: string; icon: string } {
  const hit = CODES[code];
  return { label: hit?.[0] ?? "Unknown", icon: hit?.[1] ?? "🌡️" };
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherNow> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&forecast_days=3&timezone=auto`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`weather ${res.status}`);
    const json = (await res.json()) as {
      current: Record<string, number>;
      daily: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_sum: number[];
      };
    };
    const code = Number(json.current["weather_code"] ?? 0);
    const meta = describeWeather(code);
    const data: WeatherNow = {
      temperature: Number(json.current["temperature_2m"] ?? 0),
      apparent: Number(json.current["apparent_temperature"] ?? 0),
      humidity: json.current["relative_humidity_2m"] ?? null,
      wind: Number(json.current["wind_speed_10m"] ?? 0),
      rain: Number(json.current["precipitation"] ?? 0),
      code,
      label: meta.label,
      icon: meta.icon,
      isDay: Number(json.current["is_day"] ?? 1) === 1,
      daily: (json.daily?.time ?? []).map((d, i) => ({
        date: d,
        code: json.daily.weather_code[i] ?? 0,
        max: json.daily.temperature_2m_max[i] ?? 0,
        min: json.daily.temperature_2m_min[i] ?? 0,
        rain: json.daily.precipitation_sum[i] ?? 0,
      })),
      fetchedAt: Date.now(),
    };
    cache.set(key, { at: Date.now(), data });
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14`,
      { signal: ctrl.signal, headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      name?: string;
      display_name?: string;
      address?: Record<string, string>;
    };
    const a = json.address ?? {};
    const parts = [
      json.name || a["village"] || a["town"] || a["city"] || a["suburb"] || a["county"],
      a["state"] || a["country"],
    ].filter(Boolean);
    return parts.length ? parts.join(", ") : (json.display_name ?? null);
  } catch {
    return null;
  }
}
