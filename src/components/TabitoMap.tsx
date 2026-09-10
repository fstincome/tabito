import { useEffect, useRef } from "react";
import type { LatLng } from "@/lib/geo";

export type MapMarker = {
  id: string;
  name: string;
  icon: string;
  lat: number;
  lng: number;
  accent?: boolean;
};

interface Props {
  position?: LatLng | null;
  markers: MapMarker[];
  radius?: number;
  height?: number;
  onPick?: (pos: LatLng) => void;
  className?: string;
  /** Optional circuit polyline (recorded trip). */
  path?: LatLng[];
}

export function TabitoMap({
  position,
  markers,
  radius,
  height = 380,
  onPick,
  className,
  path,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current || mapRef.current) return;

      const start = position ?? markers[0] ?? { lat: -3.3822, lng: 29.3644 };
      const map = L.map(containerRef.current, { zoomControl: true }).setView(
        [start.lat, start.lng],
        position || markers.length ? 14 : 11,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        pickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      // Ensure correct sizing after layout settles.
      setTimeout(() => map.invalidateSize(), 200);
      renderLayers(L);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function renderLayers(L: typeof import("leaflet")) {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    if (position) {
      L.circleMarker([position.lat, position.lng], {
        radius: 8,
        color: "#0b1f3a",
        weight: 3,
        fillColor: "#f97316",
        fillOpacity: 1,
      })
        .bindTooltip("You are here")
        .addTo(layer);
      if (radius) {
        L.circle([position.lat, position.lng], {
          radius,
          color: "#0891b2",
          weight: 2,
          fillColor: "#22d3ee",
          fillOpacity: 0.08,
        }).addTo(layer);
      }
    }

    for (const m of markers) {
      L.marker([m.lat, m.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="font-size:20px;line-height:1;filter:drop-shadow(0 2px 3px rgba(11,31,58,.4))">${m.icon}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      })
        .bindPopup(`<strong>${m.name}</strong>`)
        .addTo(layer);
    }
  }

  useEffect(() => {
    if (!mapRef.current) return;
    (async () => {
      const L = (await import("leaflet")).default;
      renderLayers(L);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, position, radius]);

  useEffect(() => {
    if (mapRef.current && position) {
      mapRef.current.panTo([position.lat, position.lng]);
    }
  }, [position]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className={className ?? "w-full overflow-hidden rounded-xl border border-border"}
      aria-label="TABITO map"
    />
  );
}
