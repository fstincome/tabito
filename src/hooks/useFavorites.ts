import { useSyncExternalStore } from "react";
import { FAVORITES_KEY, parseFavoriteIds, toggleFavoriteId } from "@/lib/favorites";

const CHANGE_EVENT = "tabito:favorites-changed";
const subscribe = (notify: () => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === FAVORITES_KEY || event.key === null) notify();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, notify);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, notify);
  };
};
const snapshot = () => {
  try { return window.localStorage.getItem(FAVORITES_KEY) ?? "[]"; }
  catch { return "[]"; }
};

export function useFavorites() {
  const value = useSyncExternalStore(subscribe, snapshot, () => "[]");
  return {
    ids: parseFavoriteIds(value),
    toggle: (id: string) => {
      const ids = parseFavoriteIds(window.localStorage.getItem(FAVORITES_KEY));
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(toggleFavoriteId(ids, id)));
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
  };
}