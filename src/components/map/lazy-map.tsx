"use client";

import dynamic from "next/dynamic";

/** Leaflet benötigt `window` → nur clientseitig und erst bei Bedarf laden (Lazy Loading). */
export const LazyMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full items-center justify-center rounded-xl border border-line bg-canvas text-sm text-muted">
      Karte wird geladen …
    </div>
  ),
});
export type { MapMarker, MapPopup } from "./leaflet-map";
