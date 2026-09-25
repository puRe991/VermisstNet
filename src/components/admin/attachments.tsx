import { formatDateTime } from "@/lib/format";

type Attachment = { id: string; mimeType: string; mediaType: string; sizeBytes: number; uploadedAt: Date; hasThumbnail: boolean };

/** Anhänge (nur intern; Auslieferung über autorisierte Route) */
export function Attachments({ items }: { items: Attachment[] }) {
  if (!items.length) return <p className="text-sm text-muted">Keine Anhänge.</p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {items.map((m) => (
        <li key={m.id} className="rounded-lg border border-line p-2 text-xs">
          {m.mimeType.startsWith("image/") ? (
            <a href={`/api/media/${m.id}/file`} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/media/${m.id}/file?variant=thumb`} alt="Anhang" loading="lazy" className="h-32 w-full rounded object-cover" />
            </a>
          ) : (
            <a href={`/api/media/${m.id}/file`} className="flex h-32 items-center justify-center rounded bg-canvas">
              Video herunterladen
            </a>
          )}
          <p className="mt-1 text-muted">
            {m.mimeType} · {Math.round(m.sizeBytes / 1024)} KB · {formatDateTime(m.uploadedAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}
