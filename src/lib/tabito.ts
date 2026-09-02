import { supabase } from "@/integrations/supabase/client";
import type { LatLng } from "./geo";

export type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  /** Live categories are discovered automatically as you travel (not added by hand). */
  live?: boolean;
  builtin?: boolean;
  sortOrder?: number;
};

export type AccessType = "road" | "maritime" | "air";

export const ACCESS_TYPES: { value: AccessType; label: string; icon: string }[] = [
  { value: "road", label: "Road", icon: "🛣️" },
  { value: "maritime", label: "Maritime", icon: "⛴️" },
  { value: "air", label: "Air", icon: "✈️" },
];

/** Official site specification sheet used by the tourism authorities. */
export type SiteSpec = {
  region: string;
  municipality: string;
  management: string;
  accessTypes: AccessType[];
  accessNotes: string;
  distDestKm: number | null;
  distDestHours: number | null;
  distBujaKm: number | null;
  distBujaHours: number | null;
  siteCode: string;
  narrativeGeneral: string;
  narrativeSeasonal: string;
  mediaUrl: string;
  merchantCode: string;
  restrictions: string;
  weatherSensors: boolean;
  openingHours: string;
  localContacts: string;
};

export const EMPTY_SPEC: SiteSpec = {
  region: "",
  municipality: "",
  management: "",
  accessTypes: [],
  accessNotes: "",
  distDestKm: null,
  distDestHours: null,
  distBujaKm: null,
  distBujaHours: null,
  siteCode: "",
  narrativeGeneral: "",
  narrativeSeasonal: "",
  mediaUrl: "",
  merchantCode: "",
  restrictions: "",
  weatherSensors: false,
  openingHours: "",
  localContacts: "",
};

export type TourPoint = SiteSpec & {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  address?: string | undefined;
  lat: number;
  lng: number;
  /** Up to 5 compressed data-URL images. */
  images: string[];
  createdAt: number;
};

export const MAX_IMAGES = 5;


const BUILTIN_SLUGS = new Set([
  "tourist-services",
  "attractions",
  "monuments",
  "cultural",
  "bus-stations",
  "flight-tickets",
  "natural-site",
  "cultural-heritage",
  "intangible-heritage",
  "human-interest-group",
]);

/* ------------------------------------------------------------------ */
/* Categories & points (Lovable Cloud database)                        */
/* ------------------------------------------------------------------ */

export async function loadCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, icon, is_live, sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    icon: c.icon,
    live: c.is_live,
    builtin: BUILTIN_SLUGS.has(c.slug),
    sortOrder: c.sort_order,
  }));
}

export async function createCategory(name: string, icon: string) {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || `cat-${Date.now()}`;
  const { error } = await supabase
    .from("categories")
    .insert({ name: name.slice(0, 60), icon: icon || "📍", slug });
  if (error) throw error;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

const num = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

export async function loadPoints(): Promise<TourPoint[]> {
  const { data, error } = await supabase
    .from("points")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    categoryId: p.category_id,
    name: p.name,
    description: p.description,
    address: p.address ?? undefined,
    lat: p.lat,
    lng: p.lng,
    images: p.images ?? [],
    createdAt: new Date(p.created_at).getTime(),
    region: p.region ?? "",
    municipality: p.municipality ?? "",
    management: p.management ?? "",
    accessTypes: (p.access_types ?? []) as AccessType[],
    accessNotes: p.access_notes ?? "",
    distDestKm: num(p.dist_dest_km),
    distDestHours: num(p.dist_dest_hours),
    distBujaKm: num(p.dist_buja_km),
    distBujaHours: num(p.dist_buja_hours),
    siteCode: p.site_code ?? "",
    narrativeGeneral: p.narrative_general ?? "",
    narrativeSeasonal: p.narrative_seasonal ?? "",
    mediaUrl: p.media_url ?? "",
    merchantCode: p.merchant_code ?? "",
    restrictions: p.restrictions ?? "",
    weatherSensors: p.weather_sensors ?? false,
    openingHours: p.opening_hours ?? "",
    localContacts: p.local_contacts ?? "",
  }));
}

export type PointInput = SiteSpec & {
  id?: string;
  categoryId: string;
  name: string;
  description: string;
  address?: string | undefined;
  lat: number;
  lng: number;
  images: string[];
};

export async function savePoint(input: PointInput) {
  const row = {
    category_id: input.categoryId,
    name: input.name.slice(0, 120),
    description: input.description.slice(0, 4000),
    address: input.address?.slice(0, 200) || null,
    lat: input.lat,
    lng: input.lng,
    images: input.images.slice(0, MAX_IMAGES),
    region: input.region.trim() || null,
    municipality: input.municipality.trim() || null,
    management: input.management.trim() || null,
    access_types: input.accessTypes,
    access_notes: input.accessNotes.trim() || null,
    dist_dest_km: input.distDestKm,
    dist_dest_hours: input.distDestHours,
    dist_buja_km: input.distBujaKm,
    dist_buja_hours: input.distBujaHours,
    site_code: input.siteCode.trim() || null,
    narrative_general: input.narrativeGeneral.trim() || null,
    narrative_seasonal: input.narrativeSeasonal.trim() || null,
    media_url: input.mediaUrl.trim() || null,
    merchant_code: input.merchantCode.trim() || null,
    restrictions: input.restrictions.trim() || null,
    weather_sensors: input.weatherSensors,
    opening_hours: input.openingHours.trim() || null,
    local_contacts: input.localContacts.trim() || null,
  };
  if (input.id) {
    const { error } = await supabase.from("points").update(row).eq("id", input.id);
    if (error) throw error;
  } else {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("points")
      .insert({ ...row, created_by: auth.user?.id ?? null });
    if (error) throw error;
  }
}


export async function deletePoint(id: string) {
  const { error } = await supabase.from("points").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Accounts & roles                                                    */
/* ------------------------------------------------------------------ */

export type AppRole = "admin" | "editor";

export type StaffMember = {
  id: string;
  email: string | null;
  fullName: string | null;
  roles: AppRole[];
};

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
}

export async function signUp(email: string, password: string, fullName: string) {
  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: { full_name: fullName },
    },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function loadMyRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.role as AppRole);
}

export async function loadStaff(): Promise<StaffMember[]> {
  const [{ data: profiles, error: pe }, { data: roles, error: re }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (pe) throw pe;
  if (re) throw re;
  return (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    roles: (roles ?? [])
      .filter((r) => r.user_id === p.id)
      .map((r) => r.role as AppRole),
  }));
}

export async function grantRole(userId: string, role: AppRole) {
  const { error } = await supabase
    .from("user_roles")
    .insert({ user_id: userId, role });
  if (error && !`${error.message}`.includes("duplicate")) throw error;
}

export async function revokeRole(userId: string, role: AppRole) {
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", role);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Local-only helpers                                                  */
/* ------------------------------------------------------------------ */

const HISTORY_KEY = "tabito:history:v1";

export type HistoryEntry = {
  id: string;
  name: string;
  icon: string;
  category: string;
  dist: number;
  at: number;
};

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(list: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 100)));
  } catch {
    // ignore
  }
}

/** Resize + compress an uploaded image before it is stored. */
export function compressImage(file: File, maxSize = 1000, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Unsupported image"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unavailable"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export type LivePlace = {
  id: string;
  name: string;
  icon: string;
  lat: number;
  lng: number;
  kind: string;
};

/** Overpass mirrors, tried in order — the main instance often returns 504 under load. */
const OVERPASS_MIRRORS = [
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

const LIVE_KINDS: Record<string, string> = {
  hotel: "🏨",
  guest_house: "🛏️",
  hostel: "🛏️",
  restaurant: "🍽️",
  cafe: "☕",
  bar: "🍹",
  bank: "🏦",
  atm: "🏧",
  pharmacy: "💊",
  hospital: "🏥",
  fuel: "⛽",
  police: "🚓",
  bureau_de_change: "💱",
  marketplace: "🛍️",
  information: "ℹ️",
  museum: "🏛️",
  viewpoint: "🔭",
  attraction: "📸",
  artwork: "🎨",
  bus_station: "🚌",
  taxi: "🚕",
};

type OverpassJson = {
  elements?: Array<{
    id: number;
    lat: number;
    lon: number;
    tags?: Record<string, string>;
  }>;
};

async function askMirror(url: string, query: string, ms: number): Promise<OverpassJson> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    // GET is a "simple" CORS request: no preflight, works on the widest set of mirrors.
    const res = await fetch(`${url}?data=${encodeURIComponent(query)}`, {
      signal: ctrl.signal,
      // No credentials/custom headers → keeps the request preflight-free.
      mode: "cors",
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as OverpassJson;
  } finally {
    clearTimeout(timer);
  }
}

/** Tourist services around the traveller — discovered live from OpenStreetMap. */
export async function fetchLiveServices(
  pos: LatLng,
  radius = 1200,
): Promise<LivePlace[]> {
  const q = `[out:json][timeout:20];(
    node(around:${radius},${pos.lat},${pos.lng})["tourism"];
    node(around:${radius},${pos.lat},${pos.lng})["amenity"~"restaurant|cafe|bar|bank|atm|pharmacy|hospital|fuel|police|bureau_de_change|marketplace|bus_station|taxi"];
  );out body 60;`;

  // Query every mirror at once and keep the first one that answers: a single
  // blocked or overloaded mirror can no longer break the live tracker.
  let json: OverpassJson | undefined;
  try {
    json = await Promise.any(OVERPASS_MIRRORS.map((url) => askMirror(url, q, 12000)));
  } catch {
    json = undefined;
  }

  if (!json) {
    throw new Error(
      "no OpenStreetMap mirror answered (check your connection or try again in a moment)",
    );
  }




  const out: LivePlace[] = [];
  for (const el of json.elements ?? []) {
    const tags = el.tags ?? {};
    const name = tags["name"];
    if (!name) continue;
    const kind = tags["tourism"] ?? tags["amenity"] ?? "place";
    out.push({
      id: `osm-${el.id}`,
      name,
      icon: LIVE_KINDS[kind] ?? "📍",
      lat: el.lat,
      lng: el.lon,
      kind: kind.replace(/_/g, " "),
    });
  }
  return out;
}
