import Link from "next/link";
import { formatDate } from "@/lib/format";
import { CASE_STATUS_LABELS } from "@/lib/labels";
import type { PublicCaseSummary } from "@/server/dto/public";
import { Badge, DemoBadge } from "@/components/ui";

export function CaseStatusBadge({ status, isUrgent }: { status: PublicCaseSummary["status"]; isUrgent?: boolean }) {
  if (status === "ACTIVE" && isUrgent) return <Badge tone="urgent">Dringend – aktive Suche</Badge>;
  if (status === "ACTIVE") return <Badge tone="brand">{CASE_STATUS_LABELS.ACTIVE}</Badge>;
  if (status === "FOUND") return <Badge tone="found">{CASE_STATUS_LABELS.FOUND}</Badge>;
  return <Badge>{CASE_STATUS_LABELS[status]}</Badge>;
}

function Placeholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-canvas text-muted" aria-hidden="true">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor" opacity="0.5">
        <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5z" />
      </svg>
    </div>
  );
}

export function CaseCard({ c }: { c: PublicCaseSummary }) {
  return (
    <article className="flex overflow-hidden rounded-xl border border-line bg-surface transition-shadow hover:shadow-md sm:flex-col">
      <div className="aspect-[4/5] w-28 shrink-0 sm:w-full">
        {c.primaryImage ? (
          // Eigene, bereits optimierte WebP-Varianten (Thumbnail) → kein next/image nötig
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.primaryImage.thumbUrl} alt={c.primaryImage.alt} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <Placeholder />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4">
        <div className="flex flex-wrap gap-1.5">
          <CaseStatusBadge status={c.status} isUrgent={c.isUrgent} />
          {c.isDemo && <DemoBadge />}
        </div>
        <h2 className="text-base font-semibold leading-snug">
          <Link href={`/faelle/${c.publicNumber}`} className="text-ink no-underline hover:underline">
            {c.displayName ?? c.headline}
          </Link>
        </h2>
        {c.displayName && <p className="text-sm text-muted">{c.headline}</p>}
        <dl className="mt-auto grid grid-cols-1 gap-0.5 text-sm">
          <div className="flex gap-1">
            <dt className="text-muted">Vermisst seit:</dt>
            <dd>{formatDate(c.missingSince)}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-muted">Ort:</dt>
            <dd className="truncate">{c.place}</dd>
          </div>
        </dl>
        <p className="text-xs text-muted">{c.publicNumber}</p>
      </div>
    </article>
  );
}
