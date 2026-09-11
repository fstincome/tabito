import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TabitoMap } from "@/components/TabitoMap";
import { WeatherPanel } from "@/components/WeatherPanel";
import { useSession } from "@/hooks/useSession";
import {
  SAMPLE_M,
  SAMPLE_MS,
  appendPosition,
  closeStaleTrips,
  endTrip,
  formatDuration,
  startTrip,
} from "@/lib/tracking";
import { distanceMeters, formatDistance, type LatLng } from "@/lib/geo";
import {
  fetchLiveServices,
  loadCategories,
  loadHistory,
  loadPoints,
  saveHistory,
  type Category,
  type HistoryEntry,
  type LivePlace,
  type TourPoint,
} from "@/lib/tabito";

export const Route = createFileRoute("/live")({
  component: Live,
  head: () => ({
    meta: [
      { title: "TABITO travel Live Tracker — Tourist services around you" },
      {
        name: "description",
        content:
          "Turn on GPS and let TABITO travel alert you when a listed site or a tourist service is within your chosen radius while you travel.",
      },
      { property: "og:title", content: "TABITO travel Live Tracker" },
      {
        property: "og:description",
        content:
          "Real-time GPS guidance with proximity alerts for TABITO points and nearby tourist services.",
      },
    ],
  }),
});

const ALERT_COOLDOWN_MS = 10 * 60 * 1000;
const REFRESH_DISTANCE = 300;

function Live() {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState(200);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>("default");
  const [vibrate, setVibrate] = useState(false);
  const [services, setServices] = useState<LivePlace[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [points, setPoints] = useState<TourPoint[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [tripId, setTripId] = useState<string | null>(null);
  const [tripStartedAt, setTripStartedAt] = useState<string | null>(null);
  const [tripDistance, setTripDistance] = useState(0);
  const [tripPath, setTripPath] = useState<LatLng[]>([]);
  const [tick, setTick] = useState(0);

  const watchRef = useRef<number | null>(null);
  const lastFetchRef = useRef<LatLng | null>(null);
  const alertedRef = useRef<Record<string, number>>({});
  const tripIdRef = useRef<string | null>(null);
  const lastSampleRef = useRef<{ pos: LatLng; at: number } | null>(null);
  const tripDistanceRef = useRef(0);
  const lastPosRef = useRef<LatLng | null>(null);
  const { user, isStaff } = useSession();

  useEffect(() => {
    void loadPoints().then(setPoints).catch(() => setPoints([]));
    void loadCategories().then(setCategories).catch(() => setCategories([]));
    setHistory(loadHistory());
    if (typeof Notification !== "undefined") setNotifPerm(Notification.permission);
  }, []);

  const catById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const refreshServices = useCallback(async (pos: LatLng) => {
    setServicesLoading(true);
    try {
      const list = await fetchLiveServices(pos);
      setServices(list);
      lastFetchRef.current = pos;
      setError(null);
    } catch (err) {
      setError(
        `Tourist services could not be refreshed — ${
          err instanceof Error ? err.message : "network error"
        }. Tracking stays on; retrying shortly.`,
      );
    } finally {
      setServicesLoading(false);
    }
  }, []);

  // Keep the feed alive: retry every 45s while tracking, even after a failure.
  useEffect(() => {
    if (!tracking || !position) return;
    const id = setInterval(() => {
      void refreshServices(position);
    }, 45000);
    return () => clearInterval(id);
  }, [tracking, position, refreshServices]);




  // Elapsed-time ticker while a trip is recording.
  useEffect(() => {
    if (!tripStartedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [tripStartedAt]);

  const recordSample = useCallback((next: LatLng, acc: number | null) => {
    const id = tripIdRef.current;
    if (!id) return;
    const prev = lastPosRef.current;
    if (prev) tripDistanceRef.current += distanceMeters(prev, next);
    lastPosRef.current = next;

    const last = lastSampleRef.current;
    const movedEnough = !last || distanceMeters(last.pos, next) >= SAMPLE_M;
    const waitedEnough = !last || Date.now() - last.at >= SAMPLE_MS;
    if (!movedEnough && !waitedEnough) return;

    lastSampleRef.current = { pos: next, at: Date.now() };
    setTripDistance(tripDistanceRef.current);
    setTripPath((prevPath) => [...prevPath, next]);
    void appendPosition(id, next, acc, tripDistanceRef.current).catch(() => {
      /* keep tracking even if a sample fails */
    });
  }, []);

  const startTracking = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported on this device.");
      return;
    }
    setError(null);
    const onPos = (p: GeolocationPosition) => {
      const next = { lat: p.coords.latitude, lng: p.coords.longitude };
      setPosition(next);
      setAccuracy(p.coords.accuracy);
      recordSample(next, p.coords.accuracy ?? null);
      const last = lastFetchRef.current;
      if (!last || distanceMeters(last, next) > REFRESH_DISTANCE) refreshServices(next);
    };
    const onErr = (err: GeolocationPositionError) => {
      setError(
        err.code === 1
          ? "Permission denied. Allow location access for this site in your browser settings."
          : err.code === 3
            ? "GPS timed out. Try again outdoors or near a window."
            : err.message || "GPS error",
      );
      setTracking(false);
    };
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setTracking(true);
        const first = { lat: p.coords.latitude, lng: p.coords.longitude };
        if (user && isStaff && !tripIdRef.current) {
          tripDistanceRef.current = 0;
          lastPosRef.current = first;
          lastSampleRef.current = { pos: first, at: Date.now() };
          setTripDistance(0);
          setTripPath([first]);
          void closeStaleTrips(user.id).catch(() => {});
          void startTrip(user.id, first)
            .then((trip) => {
              tripIdRef.current = trip.id;
              setTripId(trip.id);
              setTripStartedAt(trip.startedAt);
            })
            .catch(() => {
              setError("The trip could not be recorded, but live tracking stays on.");
            });
        }
        onPos(p);
        watchRef.current = navigator.geolocation.watchPosition(onPos, onErr, {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 30000,
        });
      },
      onErr,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  }, [refreshServices, recordSample, user, isStaff]);

  const stopTracking = useCallback(() => {
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setTracking(false);
    const id = tripIdRef.current;
    if (id) {
      tripIdRef.current = null;
      void endTrip(id, lastPosRef.current, tripDistanceRef.current).catch(() => {});
      setTripId(null);
      setTripStartedAt(null);
    }
  }, []);

  useEffect(() => () => stopTracking(), [stopTracking]);

  const enriched = useMemo(() => {
    if (!position) return [];
    const fromPoints = points.map((p) => ({
      id: p.id,
      name: p.name,
      icon: catById[p.categoryId]?.icon ?? "📍",
      category: catById[p.categoryId]?.name ?? "TABITO point",
      lat: p.lat,
      lng: p.lng,
      description: p.description,
      image: p.images[0],
    }));
    const fromServices = services.map((s) => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
      category: `Tourist service · ${s.kind}`,
      lat: s.lat,
      lng: s.lng,
      description: "",
      image: undefined as string | undefined,
    }));
    return [...fromPoints, ...fromServices]
      .map((p) => ({ ...p, dist: distanceMeters(position, { lat: p.lat, lng: p.lng }) }))
      .sort((a, b) => a.dist - b.dist);
  }, [points, services, position, catById]);

  useEffect(() => {
    if (!position) return;
    const now = Date.now();
    const fresh: HistoryEntry[] = [];
    for (const p of enriched) {
      if (p.dist > radius) continue;
      if (now - (alertedRef.current[p.id] ?? 0) < ALERT_COOLDOWN_MS) continue;
      alertedRef.current[p.id] = now;
      if (notifPerm === "granted" && typeof Notification !== "undefined") {
        try {
          new Notification(`${p.icon} ${p.name}`, {
            body: `${p.category} — ${formatDistance(p.dist)} away`,
            icon: "/favicon.png",
          });
        } catch {
          /* ignore */
        }
      }
      if (vibrate && typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([200, 100, 200]);
        } catch {
          /* ignore */
        }
      }
      fresh.push({
        id: p.id,
        name: p.name,
        icon: p.icon,
        category: p.category,
        dist: p.dist,
        at: now,
      });
    }
    if (fresh.length) {
      setHistory((prev) => {
        const next = [...fresh, ...prev].slice(0, 100);
        saveHistory(next);
        return next;
      });
    }
  }, [enriched, radius, position, notifPerm, vibrate]);

  const within = enriched.filter((p) => p.dist <= radius);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold text-navy sm:text-4xl">
        Live tracker
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        TABITO travel walks with you: our published points plus the tourist services detected
        around your position.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {!tracking ? (
          <button
            onClick={startTracking}
            className="rounded-full bg-sunset px-6 py-3 font-semibold text-white shadow-lift"
          >
            ▶ Start GPS tracking
          </button>
        ) : (
          <button
            onClick={stopTracking}
            className="rounded-full bg-navy px-6 py-3 font-semibold text-white"
          >
            ■ Stop
          </button>
        )}
        {notifPerm !== "granted" && (
          <button
            onClick={async () =>
              setNotifPerm(
                typeof Notification !== "undefined"
                  ? await Notification.requestPermission()
                  : "denied",
              )
            }
            className="rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold"
          >
            🔔 Enable notifications
          </button>
        )}
        <button
          onClick={() => setVibrate((v) => !v)}
          className={`rounded-full px-5 py-3 text-sm font-semibold ${
            vibrate ? "bg-lagoon text-navy-deep" : "border border-border bg-card"
          }`}
        >
          📳 Vibration {vibrate ? "ON" : "OFF"}
        </button>
        <span
          className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider ${
            tracking ? "bg-palm/25 text-navy" : "bg-muted text-muted-foreground"
          }`}
        >
          {tracking ? "● Live" : "○ Idle"}
        </span>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <TabitoMap
            position={position}
            radius={radius}
            markers={enriched.map((p) => ({
              id: p.id,
              name: p.name,
              icon: p.icon,
              lat: p.lat,
              lng: p.lng,
            }))}
            height={420}
          />

          {within.length > 0 && (
            <div className="rounded-2xl bg-sunset p-5 text-white shadow-lift">
              <p className="text-xs font-bold uppercase tracking-widest">You are near</p>
              <ul className="mt-3 space-y-2">
                {within.map((p) => (
                  <li key={p.id} className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-lg font-bold">
                      {p.icon} {p.name}
                    </span>
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 font-mono text-xs">
                      {formatDistance(p.dist)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h2 className="font-display text-xl font-bold text-navy">Around you</h2>
            {servicesLoading && (
              <p className="text-sm text-muted-foreground">Scanning tourist services…</p>
            )}
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {enriched.slice(0, 16).map((p) => (
                <li key={p.id} className="surface flex gap-3 p-3">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl">
                      {p.icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy">{p.name}</p>
                    <p className="truncate text-xs uppercase tracking-wide text-muted-foreground">
                      {p.category}
                    </p>
                    <p className="mt-1 font-mono text-xs text-lagoon-deep">
                      {formatDistance(p.dist)}
                    </p>
                  </div>
                </li>
              ))}
              {enriched.length === 0 && (
                <li className="surface col-span-full p-6 text-center text-sm text-muted-foreground">
                  Start tracking to discover what surrounds you.
                </li>
              )}
            </ul>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="surface p-5">
            <label className="text-xs font-bold uppercase tracking-widest text-navy">
              Alert radius: {radius} m
            </label>
            <input
              type="range"
              min={50}
              max={1000}
              step={25}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="mt-3 w-full accent-[var(--sunset)]"
            />
          </div>

          <div className="surface p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-navy">
              GPS status
            </p>
            <div className="mt-2 font-mono text-xs text-muted-foreground">
              {position ? (
                <>
                  <div>lat {position.lat.toFixed(5)}</div>
                  <div>lng {position.lng.toFixed(5)}</div>
                  {accuracy != null && <div>±{Math.round(accuracy)} m</div>}
                </>
              ) : (
                <div>—</div>
              )}
            </div>
            {position && (
              <button
                onClick={() => refreshServices(position)}
                className="mt-3 rounded-full bg-muted px-4 py-2 text-xs font-semibold"
              >
                ↻ Refresh services
              </button>
            )}
          </div>

          <div className="surface p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-navy">
                Alert history
              </p>
              {history.length > 0 && (
                <button
                  onClick={() => {
                    setHistory([]);
                    saveHistory([]);
                  }}
                  className="text-xs font-semibold text-muted-foreground underline"
                >
                  Clear
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">No alerts yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {history.slice(0, 12).map((h, i) => (
                  <li key={`${h.id}-${h.at}-${i}`} className="text-sm">
                    <span className="mr-1">{h.icon}</span>
                    <span className="font-medium">{h.name}</span>
                    <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                      {formatDistance(h.dist)} ·{" "}
                      {new Date(h.at).toLocaleTimeString("en-GB")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
