import { supabase } from "@/integrations/supabase/client";
import { distanceMeters, type LatLng } from "@/lib/geo";
import { reverseGeocode } from "@/lib/weather";

export type Trip = {
  id: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  startLat: number;
  startLng: number;
  startLabel: string | null;
  endLat: number | null;
  endLng: number | null;
  endLabel: string | null;
  distanceM: number;
  isActive: boolean;
};

export type TripPosition = {
  id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  recordedAt: string;
};

type Row = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  start_lat: number;
  start_lng: number;
  start_label: string | null;
  end_lat: number | null;
  end_lng: number | null;
  end_label: string | null;
  distance_m: number;
  is_active: boolean;
};

function mapTrip(r: Row): Trip {
  return {
    id: r.id,
    userId: r.user_id,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    startLat: r.start_lat,
    startLng: r.start_lng,
    startLabel: r.start_label,
    endLat: r.end_lat,
    endLng: r.end_lng,
    endLabel: r.end_label,
    distanceM: r.distance_m,
    isActive: r.is_active,
  };
}

/** Minimum spacing between recorded samples. */
export const SAMPLE_MS = 30_000;
export const SAMPLE_M = 50;
const STALE_MS = 30 * 60 * 1000;

export async function startTrip(userId: string, pos: LatLng): Promise<Trip> {
  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: userId,
      start_lat: pos.lat,
      start_lng: pos.lng,
      is_active: true,
    })
    .select("*")
    .single();
  if (error) throw error;
  const trip = mapTrip(data as Row);
  await supabase.from("trip_positions").insert({
    trip_id: trip.id,
    lat: pos.lat,
    lng: pos.lng,
  });
  void reverseGeocode(pos.lat, pos.lng).then((label) => {
    if (label) void supabase.from("trips").update({ start_label: label }).eq("id", trip.id);
  });
  return trip;
}

export async function appendPosition(
  tripId: string,
  pos: LatLng,
  accuracy: number | null,
  distanceM: number,
): Promise<void> {
  const { error } = await supabase.from("trip_positions").insert({
    trip_id: tripId,
    lat: pos.lat,
    lng: pos.lng,
    accuracy,
  });
  if (error) throw error;
  await supabase.from("trips").update({ distance_m: distanceM }).eq("id", tripId);
}

export async function endTrip(
  tripId: string,
  pos: LatLng | null,
  distanceM: number,
): Promise<void> {
  await supabase
    .from("trips")
    .update({
      ended_at: new Date().toISOString(),
      is_active: false,
      distance_m: distanceM,
      ...(pos ? { end_lat: pos.lat, end_lng: pos.lng } : {}),
    })
    .eq("id", tripId);
  if (pos) {
    const label = await reverseGeocode(pos.lat, pos.lng);
    if (label) await supabase.from("trips").update({ end_label: label }).eq("id", tripId);
  }
}

/** Close trips left open by a closed tab (no sample for 30 min). */
export async function closeStaleTrips(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_MS).toISOString();
  await supabase
    .from("trips")
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_active", true)
    .lt("updated_at", cutoff);
}

export async function loadTrips(limit = 100): Promise<Trip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as Row[]).map(mapTrip);
}

export async function loadTripPositions(tripId: string): Promise<TripPosition[]> {
  const { data, error } = await supabase
    .from("trip_positions")
    .select("id, lat, lng, accuracy, recorded_at")
    .eq("trip_id", tripId)
    .order("recorded_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    lat: r.lat as number,
    lng: r.lng as number,
    accuracy: (r.accuracy as number | null) ?? null,
    recordedAt: r.recorded_at as string,
  }));
}

export async function deleteTrip(tripId: string): Promise<void> {
  const { error } = await supabase.from("trips").delete().eq("id", tripId);
  if (error) throw error;
}

export function pathDistance(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distanceMeters(points[i - 1]!, points[i]!);
  return total;
}

export function formatDuration(fromISO: string, toISO: string | null): string {
  const ms = (toISO ? new Date(toISO).getTime() : Date.now()) - new Date(fromISO).getTime();
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}
