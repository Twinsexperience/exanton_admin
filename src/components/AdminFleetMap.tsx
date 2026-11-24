import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AdminVehicleItem, HeatmapPoint } from "../services/adminApi";

interface AdminFleetMapProps {
  vehicles: AdminVehicleItem[];
  selectedId: string;
  onSelectVehicle: (id: string) => void;
  focusTrigger?: number;
  heatmapPoints?: HeatmapPoint[];
  showHeatmap?: boolean;
}

export const AdminFleetMap: React.FC<AdminFleetMapProps> = ({
  vehicles,
  selectedId,
  onSelectVehicle,
  focusTrigger = 0,
  heatmapPoints = [],
  showHeatmap = false,
}) => {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const heatLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    const first = vehicles.find(
      (v) => v.lastLat !== null && v.lastLon !== null
    );
    const center: [number, number] = first
      ? [first.lastLat!, first.lastLon!]
      : [18.3808, -65.9574];

    const map = L.map(mapDivRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(center, 13);

    L.control.zoom({ position: "topright" }).addTo(map);

    // Tiles OpenStreetMap con filtro dark táctico en CSS (sin API key requerida)
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    heatLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      heatLayerRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const layer = heatLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showHeatmap) return;

    heatmapPoints.forEach((pt) => {
      const color = pt.weight >= 0.9 ? "#ff1e3c" : pt.weight >= 0.65 ? "#f59e0b" : "#8b5cf6";
      const circle = L.circleMarker([pt.lat, pt.lon], {
        radius: Math.round(14 + pt.weight * 14),
        color,
        weight: 1,
        fillColor: color,
        fillOpacity: 0.28,
      });
      circle.bindTooltip(pt.label);
      circle.addTo(layer);
    });
  }, [heatmapPoints, showHeatmap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const activeIds = new Set(vehicles.map((v) => v.id));
    markersRef.current.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        map.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });

    vehicles.forEach((v) => {
      if (v.lastLat === null || v.lastLon === null) return;
      const pos: [number, number] = [v.lastLat, v.lastLon];
      const isSelected = v.id === selectedId;
      const color =
        v.relayState === "CUT"
          ? "#ff1e3c"
          : v.relayState === "PENDING_CUT"
          ? "#f59e0b"
          : v.online
          ? "#8b5cf6"
          : "#64748b";

      const ring = isSelected
        ? `<circle cx="18" cy="18" r="17" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3 2"/>`
        : "";

      const icon = L.divIcon({
        className: "warden-admin-pin",
        html: `<svg width="38" height="38" viewBox="0 0 36 36" style="transform: rotate(${
          v.lastCourse || 0
        }deg); filter: drop-shadow(0 0 8px ${color});">${ring}<circle cx="18" cy="18" r="13" fill="rgba(6,7,11,0.92)" stroke="${color}" stroke-width="2.5"/><polygon points="18,7 24,23 18,19.5 12,23" fill="${color}" stroke="#ffffff" stroke-width="1"/></svg>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      const existing = markersRef.current.get(v.id);
      if (existing) {
        existing.setLatLng(pos);
        existing.setIcon(icon);
      } else {
        const m = L.marker(pos, { icon }).addTo(map);
        m.bindTooltip(
          `${v.alias} (${v.plate}) • ${Math.round(v.lastSpeedKmh)} km/h`
        );
        m.on("click", () => onSelectVehicle(v.id));
        markersRef.current.set(v.id, m);
      }
    });
  }, [vehicles, selectedId, onSelectVehicle]);

  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const v = vehicles.find((item) => item.id === selectedId);
    if (v && v.lastLat !== null && v.lastLon !== null) {
      mapRef.current.flyTo([v.lastLat, v.lastLon], 15, { duration: 0.6 });
    }
  }, [focusTrigger]);

  return <div ref={mapDivRef} className="soc-fullscreen-map" />;
};
