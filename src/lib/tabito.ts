import type { LatLng } from "./geo";

export type Category = {
  id: string;
  name: string;
  icon: string;
  /** Live categories are discovered automatically as you travel (not added by hand). */
  live?: boolean;
  builtin?: boolean;
};

export type TourPoint = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  address?: string;
  lat: number;
  lng: number;
  /** Up to 5 compressed data-URL images. */
  images: string[];
  createdAt: number;
};

export const MAX_IMAGES = 5;

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "tourist-services",
    name: "Tourist Services",
    icon: "🧭",
    live: true,
    builtin: true,
  },
  { id: "attractions", name: "Attractions & Tourist Sites", icon: "🏞️", builtin: true },
  { id: "monuments", name: "Historical Monuments", icon: "🏛️", builtin: true },
  { id: "cultural", name: "Cultural Products & Centres", icon: "🎭", builtin: true },
  { id: "bus-stations", name: "Bus Stations & Travel Agencies", icon: "🚌", builtin: true },
  { id: "flight-tickets", name: "Flight Ticket Offices", icon: "✈️", builtin: true },
];

const CATEGORIES_KEY = "tabito:categories:v1";
const POINTS_KEY = "tabito:points:v1";
const HISTORY_KEY = "tabito:history:v1";
const ADMIN_KEY = "tabito:admin";

export const ADMIN_PASSCODE = "TABITO2026";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full — ignore
  }
}

export function loadCategories(): Category[] {
  const stored = read<Category[] | null>(CATEGORIES_KEY, null);
  if (!stored || stored.length === 0) return DEFAULT_CATEGORIES;
  // Always keep the built-in list available, merged with custom ones.
  const merged = [...DEFAULT_CATEGORIES];
  for (const c of stored) {
    const i = merged.findIndex((m) => m.id === c.id);
    if (i >= 0) merged[i] = { ...merged[i], ...c };
    else merged.push(c);
  }
  return merged;
}

export function saveCategories(list: Category[]) {
  write(CATEGORIES_KEY, list);
}

export function loadPoints(): TourPoint[] {
  return read<TourPoint[]>(POINTS_KEY, []);
}

export function savePoints(list: TourPoint[]) {
  write(POINTS_KEY, list);
}

export type HistoryEntry = {
  id: string;
  name: string;
  icon: string;
  category: string;
  dist: number;
  at: number;
};

export function loadHistory(): HistoryEntry[] {
  return read<HistoryEntry[]>(HISTORY_KEY, []);
}

export function saveHistory(list: HistoryEntry[]) {
  write(HISTORY_KEY, list.slice(0, 100));
}

export function isAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(ADMIN_KEY) === "1";
}

export function setAdmin(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) sessionStorage.setItem(ADMIN_KEY, "1");
  else sessionStorage.removeItem(ADMIN_KEY);
}

/** Resize + compress an uploaded image so several fit in local storage. */
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

export function exportData() {
  return JSON.stringify(
    { categories: loadCategories(), points: loadPoints(), exportedAt: Date.now() },
    null,
    2,
  );
}

export function importData(json: string): { categories: number; points: number } {
  const parsed = JSON.parse(json) as { categories?: Category[]; points?: TourPoint[] };
  if (parsed.categories) saveCategories(parsed.categories);
  if (parsed.points) savePoints(parsed.points);
  return {
    categories: parsed.categories?.length ?? 0,
    points: parsed.points?.length ?? 0,
  };
}

export type LivePlace = {
  id: string;
  name: string;
  icon: string;
  lat: number;
  lng: number;
  kind: string;
};

const OVERPASS = "https://overpass-api.de/api/interpreter";

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

/** Tourist services around the traveller — discovered live from OpenStreetMap. */
export async function fetchLiveServices(
  pos: LatLng,
  radius = 1200,
): Promise<LivePlace[]> {
  const q = `[out:json][timeout:25];(
    node(around:${radius},${pos.lat},${pos.lng})["tourism"];
    node(around:${radius},${pos.lat},${pos.lng})["amenity"~"restaurant|cafe|bar|bank|atm|pharmacy|hospital|fuel|police|bureau_de_change|marketplace|bus_station|taxi"];
  );out body 60;`;

  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(q)}`,
  });
  if (!res.ok) throw new Error(`Overpass error ${res.status}`);
  const json = (await res.json()) as {
    elements?: Array<{
      id: number;
      lat: number;
      lon: number;
      tags?: Record<string, string>;
    }>;
  };

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
