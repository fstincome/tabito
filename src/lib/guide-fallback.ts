import data from "./guide-fallback.json";
import { EMPTY_SPEC, type Category, type TourPoint } from "./tabito";

/** Bundled snapshot shown instantly before live data arrives (no photos, short text). */
export const FALLBACK_CATEGORIES: Category[] = data.categories;

export const FALLBACK_POINTS: TourPoint[] = data.points.map((p) => ({
  ...EMPTY_SPEC,
  ...p,
  images: [],
  createdAt: 0,
}));
