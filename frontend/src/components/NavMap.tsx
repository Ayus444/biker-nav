// src/components/NavMap.tsx
"use client";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import { RouteData } from "@/lib/offlineStore";
import { Position } from "@/hooks/useNavigation";

interface Props {
  route: RouteData | null;
  position: Position | null;
  focusMode: boolean;
}

export default function NavMap({ route, position, focusMode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const routeLayerRef = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);

  // Init map
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    if (mapRef.current) return; // already initialized

    const L = require("leaflet");
    require("leaflet/dist/leaflet.css");

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: !focusMode,
      center: [48.8566, 2.3522], // Paris default until GPS kicks in
      zoom: 15,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: "© OpenStreetMap, © CARTO",
        maxZoom: 19,
      }
    ).addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw route
  useEffect(() => {
    if (!mapRef.current || !route) return;
    const L = require("leaflet");
    const map = mapRef.current;

    // Clear old layer
    if (routeLayerRef.current) {
      (routeLayerRef.current as ReturnType<typeof L.polyline>).remove();
    }

    const latlngs = route.coordinates.map(([lat, lng]) => [lat, lng]);

    const poly = L.polyline(latlngs, {
      color: "#F97316",
      weight: 6,
      opacity: 0.9,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);

    routeLayerRef.current = poly;
    map.fitBounds(poly.getBounds(), { padding: [40, 40] });
  }, [route]);

  // Track rider position
  useEffect(() => {
    if (!mapRef.current || !position) return;
    const L = require("leaflet");
    const map = mapRef.current;

    const riderIcon = L.divIcon({
      className: "",
      html: `
        <div style="
          width:20px;height:20px;
          background:#F97316;
          border:3px solid #fff;
          border-radius:50%;
          box-shadow:0 0 12px #F97316,0 0 24px #F9731660;
        "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    if (markerRef.current) {
      (markerRef.current as ReturnType<typeof L.marker>)
        .setLatLng([position.lat, position.lng]);
    } else {
      markerRef.current = L.marker([position.lat, position.lng], {
        icon: riderIcon,
        zIndexOffset: 1000,
      }).addTo(map);
    }

    // Follow rider
    map.setView([position.lat, position.lng], 17, { animate: true });
  }, [position]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", background: "#111" }}
    />
  );
}
