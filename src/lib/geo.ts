/** Rastergröße für öffentliche Koordinaten in Grad (≈ 1,1 km bzw. 2,2 km in Nord-Süd-Richtung). */
export const PUBLIC_GRID_DEG = 0.01;
export const PUBLIC_GRID_DEG_MINOR = 0.02;
const METERS_PER_DEG_LAT = 111_320;

function snap(value: number, step: number): number {
  // auf Rasterpunkt runden und Gleitkomma-Artefakte beseitigen
  return Number((Math.round(value / step) * step).toFixed(6));
}

/**
 * Generalisiert eine Koordinate für die öffentliche Ausgabe.
 * Die zurückgegebene Genauigkeit ist nie besser als die gespeicherte oder das Raster.
 */
export function generalizeCoordinate(
  lat: number,
  lng: number,
  opts: { minor: boolean; precisionM: number },
): { lat: number; lng: number; precisionM: number } {
  const step = opts.minor ? PUBLIC_GRID_DEG_MINOR : PUBLIC_GRID_DEG;
  const gridMeters = Math.round(step * METERS_PER_DEG_LAT);
  return {
    lat: snap(lat, step),
    lng: snap(lng, step),
    precisionM: Math.max(opts.precisionM, gridMeters),
  };
}

export type BBox = { minLng: number; minLat: number; maxLng: number; maxLat: number };

export function parseBBox(raw: string | null | undefined): BBox | null {
  if (!raw) return null;
  const parts = raw.split(",").map((p) => Number(p.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [minLng, minLat, maxLng, maxLat] = parts as [number, number, number, number];
  if (minLat < -90 || maxLat > 90 || minLng < -180 || maxLng > 180) return null;
  if (minLat >= maxLat || minLng >= maxLng) return null;
  return { minLng, minLat, maxLng, maxLat };
}
