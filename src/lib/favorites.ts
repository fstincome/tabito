export const FAVORITES_KEY = "tabito:favorites:v1";

export function parseFavoriteIds(value: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((id): id is string => typeof id === "string" && id.length > 0))]
      : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((saved) => saved !== id) : [...ids, id];
}