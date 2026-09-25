"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";

export type MapPopup = {
  title: string;
  subtitle?: string | null;
  lines?: [string, string][];
  imageUrl?: string | null;
  imageAlt?: string;
  href?: string;
  linkLabel?: string;
  note?: string;
};

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  precisionM?: number;
  urgent?: boolean;
  /** Ungefährer Bereich statt Punkt darstellen */
  area?: boolean;
  label?: string;
  popup?: MapPopup;
};

export type BBoxString = string;

const TILE_URL = process.env.NEXT_PUBLIC_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = process.env.NEXT_PUBLIC_TILE_ATTRIBUTION || "&copy; OpenStreetMap-Mitwirkende";

/** Popup sicher per DOM-API aufbauen – niemals HTML-Strings aus Daten (XSS-Schutz). */
function buildPopup(p: MapPopup): HTMLElement {
  const root = document.createElement("div");
  root.className = "va-popup";
  if (p.imageUrl) {
    const img = document.createElement("img");
    img.src = p.imageUrl;
    img.alt = p.imageAlt ?? "";
    img.loading = "lazy";
    root.appendChild(img);
  }
  const title = document.createElement("strong");
  title.textContent = p.title;
  title.style.display = "block";
  root.appendChild(title);
  if (p.subtitle) {
    const sub = document.createElement("div");
    sub.textContent = p.subtitle;
    sub.style.color = "#566373";
    root.appendChild(sub);
  }
  for (const [label, value] of p.lines ?? []) {
    const row = document.createElement("div");
    const l = document.createElement("span");
    l.textContent = `${label}: `;
    l.style.color = "#566373";
    const v = document.createElement("span");
    v.textContent = value;
    row.append(l, v);
    root.appendChild(row);
  }
  if (p.note) {
    const note = document.createElement("div");
    note.textContent = p.note;
    note.style.fontSize = "0.75rem";
    note.style.color = "#566373";
    note.style.marginTop = "0.25rem";
    root.appendChild(note);
  }
  if (p.href && p.href.startsWith("/")) {
    const a = document.createElement("a");
    a.href = p.href;
    a.className = "va-popup-btn";
    a.textContent = p.linkLabel ?? "Öffnen";
    root.appendChild(a);
  }
  return root;
}

function pointIcon(urgent?: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="va-marker${urgent ? " va-marker--urgent" : ""}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

export default function LeafletMap({
  markers,
  cluster = false,
  fit = true,
  className = "h-[420px] w-full rounded-xl",
  onViewChange,
  ariaLabel = "Karte",
}: {
  markers: MapMarker[];
  cluster?: boolean;
  fit?: boolean;
  className?: string;
  onViewChange?: (bbox: BBoxString) => void;
  ariaLabel?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;

  useEffect(() => {
    if (!el.current || mapRef.current) return;
    const map = L.map(el.current, { center: [51.16, 10.45], zoom: 6, scrollWheelZoom: true, maxZoom: 14 });
    // Maximaler Zoom begrenzt: öffentliche Daten sind ohnehin generalisiert
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 14 }).addTo(map);
    const emit = () => {
      const b = map.getBounds();
      const r = (n: number) => n.toFixed(4);
      onViewChangeRef.current?.(
        [r(Math.max(-180, b.getWest())), r(Math.max(-90, b.getSouth())), r(Math.min(180, b.getEast())), r(Math.min(90, b.getNorth()))].join(","),
      );
    };
    map.on("moveend", emit);
    mapRef.current = map;
    return () => {
      map.off("moveend", emit);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layerRef.current?.remove();
    const group: L.LayerGroup = cluster
      ? L.markerClusterGroup({
          showCoverageOnHover: false,
          maxClusterRadius: 50,
          iconCreateFunction: (c) => {
            const n = c.getChildCount();
            const size = n < 10 ? 34 : n < 100 ? 42 : 50;
            return L.divIcon({
              html: `<div class="va-cluster" style="width:${size}px;height:${size}px">${n}</div>`,
              className: "",
              iconSize: [size, size],
            });
          },
        })
      : L.layerGroup();

    const bounds: L.LatLngExpression[] = [];
    for (const m of markers) {
      const ll: L.LatLngExpression = [m.lat, m.lng];
      bounds.push(ll);
      if (m.area) {
        const circle = L.circle(ll, {
          radius: m.precisionM ?? 1000,
          color: m.urgent ? "#8a3a12" : "#1d4e6e",
          weight: 2,
          fillOpacity: 0.15,
        });
        if (m.popup) circle.bindPopup(() => buildPopup(m.popup!));
        if (m.label) circle.bindTooltip(m.label);
        group.addLayer(circle);
      } else {
        const marker = L.marker(ll, { icon: pointIcon(m.urgent), keyboard: true, title: m.label ?? "" });
        if (m.popup) marker.bindPopup(() => buildPopup(m.popup!));
        group.addLayer(marker);
      }
    }
    group.addTo(map);
    layerRef.current = group;

    if (fit && bounds.length) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 12 });
    }
  }, [markers, cluster, fit]);

  return <div ref={el} className={className} role="region" aria-label={ariaLabel} />;
}
