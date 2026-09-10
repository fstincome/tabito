# Weather on each site + staff trip tracking

Two additions to TABITO travel.

## 1. Automatic local weather next to the coordinates

Wherever a site's latitude/longitude is shown, add a small live weather panel for that exact spot: temperature, feels-like, wind, rain, humidity and a short sky description, plus a 3-day mini forecast.

- Source: Open-Meteo (free, no account, no key needed).
- Appears in:
  - the site detail view on the Guide page, right beside the coordinates;
  - the admin site form, beside the latitude/longitude fields, so staff see the weather of the place they are entering.
- Refreshes when the coordinates change, caches for 10 minutes, and shows a discreet "weather unavailable" line if the service does not answer.

## 2. Remote tracking of staff (trips and circuits)

While a signed-in admin or editor has the live tracker on, their position is recorded as a trip.

- A trip starts when tracking is started: departure point saved (coordinates + time + place name looked up from the map service).
- Positions are appended along the way (one sample at most every ~30 seconds or ~50 m of movement).
- A trip ends when tracking is stopped, or is closed automatically if no sample arrives for 30 minutes.
- The tracker page shows a "Recording trip" badge, elapsed time and distance covered.

New admin tab **Field tracking**:
- List of trips: person, start place and time, end place and time, duration, distance, live/finished status.
- Selecting a trip draws the full circuit on a map (line from departure to arrival with all recorded points).
- Editors see only their own trips; admins see everyone's.

## Technical notes

- New tables: `trips` (user_id, started_at, ended_at, start lat/lng/label, end lat/lng/label, distance_m, is_active) and `trip_positions` (trip_id, lat, lng, accuracy, recorded_at). Grants + RLS: staff insert/update their own rows, admins read all, editors read their own.
- Weather helper `src/lib/weather.ts` calling Open-Meteo current + daily forecast, with an in-memory cache keyed by rounded coordinates; reverse geocoding of start/end labels via the existing OpenStreetMap Nominatim usage.
- Trip recording lives in `src/lib/tracking.ts` and hooks into the existing `watchPosition` loop in `src/routes/live.tsx` — the existing tourist-service scanning and alerts are untouched.
- `TabitoMap` gains an optional `path` prop to draw the circuit polyline.
