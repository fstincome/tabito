import { useEffect, useState } from "react";
import { describeWeather, fetchWeather, type WeatherNow } from "@/lib/weather";

interface Props {
  lat: number | null;
  lng: number | null;
  compact?: boolean;
  className?: string;
}

export function WeatherPanel({ lat, lng, compact, className }: Props) {
  const [data, setData] = useState<WeatherNow | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setData(null);
      setState("idle");
      return;
    }
    let active = true;
    setState("loading");
    fetchWeather(lat, lng)
      .then((w) => {
        if (!active) return;
        setData(w);
        setState("idle");
      })
      .catch(() => {
        if (!active) return;
        setData(null);
        setState("error");
      });
    return () => {
      active = false;
    };
  }, [lat, lng]);

  if (lat == null || lng == null) return null;

  if (state === "loading" && !data)
    return (
      <p className={`text-xs text-muted-foreground ${className ?? ""}`}>
        Loading local weather…
      </p>
    );

  if (state === "error" || !data)
    return (
      <p className={`text-xs text-muted-foreground ${className ?? ""}`}>
        Local weather unavailable right now.
      </p>
    );

  return (
    <div
      className={`rounded-xl border border-border bg-card p-3 ${className ?? ""}`}
      aria-label="Local weather"
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl leading-none">{data.icon}</span>
        <div className="min-w-0">
          <p className="font-display text-xl font-bold text-navy">
            {Math.round(data.temperature)}°C
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {data.label} · feels {Math.round(data.apparent)}°C
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
        <span>💨 {Math.round(data.wind)} km/h</span>
        {data.humidity != null && <span>💧 {Math.round(data.humidity)}%</span>}
        <span>🌧️ {data.rain.toFixed(1)} mm</span>
      </div>
      {!compact && data.daily.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
          {data.daily.map((d) => (
            <li key={d.date} className="rounded-lg bg-muted/60 p-2">
              <p className="font-semibold text-navy">
                {new Date(d.date).toLocaleDateString("en-GB", { weekday: "short" })}
              </p>
              <p className="text-base leading-tight">{describeWeather(d.code).icon}</p>
              <p className="font-mono text-muted-foreground">
                {Math.round(d.max)}° / {Math.round(d.min)}°
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
