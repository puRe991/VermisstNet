"use client";

import { useMemo } from "react";
import { LazyMap, type MapMarker } from "@/components/map/lazy-map";
import { LOCATION_TYPE_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import type { PublicLocation } from "@/server/dto/public";

export function CaseLocationsMap({ locations }: { locations: PublicLocation[] }) {
  const markers = useMemo<MapMarker[]>(
    () =>
      locations.map((l) => ({
        id: l.id,
        lat: l.lat,
        lng: l.lng,
        precisionM: l.precisionM,
        area: true,
        label: LOCATION_TYPE_LABELS[l.type],
        popup: {
          title: LOCATION_TYPE_LABELS[l.type],
          subtitle: l.label,
          lines: l.observedAt ? [["Zeitpunkt", formatDateTime(l.observedAt)]] : [],
          note: `Ungefährer Bereich (±${Math.round(l.precisionM / 100) / 10} km)${l.isConfirmed ? "" : " – nicht bestätigt"}`,
        },
      })),
    [locations],
  );
  return <LazyMap markers={markers} ariaLabel="Karte mit ungefähren Ortsangaben zum Fall" className="h-[320px] w-full rounded-xl sm:h-[380px]" />;
}
