import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CaseStatusBadge } from "@/components/public/case-card";
import { CaseLocationsMap } from "@/components/public/case-locations-map";
import { ReportContent } from "@/components/public/report-content";
import { Alert, ButtonLink, Card, DefinitionList, DemoBadge } from "@/components/ui";
import { formatDate, formatDateTime, formatKm } from "@/lib/format";
import { COMPUTED_LABEL, GENDER_LABELS, LOCATION_TYPE_LABELS, SOURCE_TYPE_LABELS, TIMELINE_EVENT_TYPE_LABELS } from "@/lib/labels";
import { AppError } from "@/server/errors";
import { getGeoAnalysis, getPublicCase } from "@/server/services/public-cases";

const load = cache(async (nr: string) => {
  try {
    return await getPublicCase(decodeURIComponent(nr));
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
});

type Params = Promise<{ nr: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const c = await load((await params).nr);
  return {
    title: c.displayName ? `${c.displayName} – ${c.headline}` : c.headline,
    description: `${c.headline} seit ${formatDate(c.missingSince)} in ${c.place}. Fallnummer ${c.publicNumber}.`,
    // Nach Auffinden nicht mehr in Suchmaschinen indexieren (Persönlichkeitsschutz)
    robots: c.status === "ACTIVE" ? undefined : { index: false, follow: false },
  };
}

export default async function CasePage({ params }: { params: Params }) {
  const c = await load((await params).nr);
  const geo = c.reduced ? null : await getGeoAnalysis(c.publicNumber);
  const main = c.images[0];

  return (
    <article className="space-y-6">
      {c.isDemo && (
        <Alert tone="warn" title="DEMO DATA">
          Dies ist ein fiktiver Beispielfall zu Demonstrationszwecken. Die Person existiert nicht.
        </Alert>
      )}
      {c.reduced && (
        <Alert tone={c.status === "FOUND" ? "found" : "neutral"} title={c.status === "FOUND" ? "Die Person wurde gefunden." : "Dieser Fall ist abgeschlossen."}>
          Die öffentliche Suche ist beendet. Zum Schutz der Person werden Bilder, Beschreibungen und Ortsangaben nicht mehr angezeigt.
        </Alert>
      )}

      <header className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
        <div>
          {main ? (
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={main.url} alt={main.alt} width={640} height={800} className="w-full rounded-xl border border-line bg-canvas object-cover" />
              <figcaption className="mt-1 text-xs text-muted">
                {main.sourceText ? `Bildquelle: ${main.sourceText}` : "Suchbild"}
              </figcaption>
            </figure>
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center rounded-xl border border-line bg-surface text-sm text-muted">
              Kein Bild veröffentlicht
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <CaseStatusBadge status={c.status} isUrgent={c.isUrgent} />
            {c.isDemo && <DemoBadge />}
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{c.headline}</h1>
            {c.displayName && <p className="mt-1 text-lg">{c.displayName}</p>}
          </div>
          <DefinitionList
            items={[
              { label: "Vermisst seit", value: formatDate(c.missingSince) },
              { label: "Ort", value: c.place },
              { label: "Letzter bestätigter Aufenthaltsort", value: c.lastKnownPlace },
              { label: "Bundesland", value: c.federalStateName },
              { label: "Fallnummer", value: c.publicNumber },
              { label: "Zuständige Stelle", value: c.responsibleAuthority },
            ]}
          />
          {!c.reduced && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <ButtonLink href={`/faelle/${c.publicNumber}/hinweis`}>Hinweis zu diesem Fall melden</ButtonLink>
            </div>
          )}
          {!c.reduced && (
            <p className="text-sm text-muted">
              Sehen Sie die Person gerade oder besteht Gefahr? Rufen Sie sofort <strong>110</strong> an
              {c.authorityContact ? <> oder wenden Sie sich an: {c.authorityContact}</> : null}.
            </p>
          )}
        </div>
      </header>

      {c.person && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Personenbeschreibung</h2>
          <DefinitionList
            items={[
              { label: "Alter", value: c.age !== null ? `${c.age} Jahre (zum Zeitpunkt des Verschwindens)` : null },
              { label: "Geschlecht", value: GENDER_LABELS[c.gender] },
              { label: "Größe", value: c.person.heightCm ? `ca. ${c.person.heightCm} cm` : null },
              { label: "Statur", value: c.person.build },
              { label: "Haare", value: c.person.hairColor },
              { label: "Augen", value: c.person.eyeColor },
              { label: "Bekleidung", value: c.clothing },
              { label: "Besondere Merkmale", value: c.person.distinguishingFeatures },
              { label: "Weitere Beschreibung", value: c.person.description },
            ]}
          />
        </Card>
      )}

      {c.circumstances && (
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Bekannte Informationen</h2>
          <p className="whitespace-pre-line">{c.circumstances}</p>
        </Card>
      )}

      {c.timeline.length > 0 && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Chronologie</h2>
          <ol className="relative space-y-5 border-l-2 border-line pl-5">
            {c.timeline.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-surface bg-brand" aria-hidden="true" />
                <p className="text-sm font-semibold">
                  <time dateTime={e.occurredAt}>{formatDate(e.occurredAt)}</time> · {TIMELINE_EVENT_TYPE_LABELS[e.type]}
                </p>
                <p className="mt-0.5">{e.description}</p>
                {e.source && (
                  <p className="mt-0.5 text-xs text-muted">
                    Quelle:{" "}
                    {e.source.url ? (
                      <a href={e.source.url} rel="noopener noreferrer nofollow" target="_blank">
                        {e.source.organization ? `${e.source.organization} – ` : ""}
                        {e.source.title}
                      </a>
                    ) : (
                      <>
                        {e.source.organization ? `${e.source.organization} – ` : ""}
                        {e.source.title}
                      </>
                    )}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {c.locations.length > 0 && (
        <Card>
          <h2 className="mb-1 text-lg font-semibold">Karte</h2>
          <p className="mb-3 text-sm text-muted">
            Dargestellt sind nur freigegebene, bewusst ungenaue Bereiche – keine exakten Adressen.
          </p>
          <CaseLocationsMap locations={c.locations} />
          <ul className="mt-3 space-y-1 text-sm">
            {c.locations.map((l) => (
              <li key={l.id}>
                <span className="font-semibold">{LOCATION_TYPE_LABELS[l.type]}:</span> {l.label}
                {l.observedAt ? ` (${formatDateTime(l.observedAt)})` : ""}
                {!l.isConfirmed && <span className="text-muted"> – nicht bestätigt</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {geo && geo.segments.length > 0 && (
        <Card className="border-warn/40">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Geografische Zusammenhänge</h2>
            <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-semibold text-warn">{COMPUTED_LABEL}</span>
          </div>
          <p className="mb-3 text-sm text-muted">{geo.disclaimer}</p>
          <ul className="space-y-1 text-sm">
            {geo.segments.map((s, i) => (
              <li key={i}>
                {s.from} → {s.to}: ca. {formatKm(s.distanceKm)} Luftlinie
                {s.hoursBetween !== null ? `, ${s.hoursBetween.toLocaleString("de-DE")} Std. zwischen den Zeitpunkten` : ""}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 text-lg font-semibold">Quellen</h2>
        {c.sources.length ? (
          <ul className="space-y-3">
            {c.sources.map((s) => (
              <li key={s.id} className="text-sm">
                <p className="font-semibold">
                  {s.url ? (
                    <a href={s.url} rel="noopener noreferrer nofollow" target="_blank">{s.title}</a>
                  ) : (
                    s.title
                  )}
                </p>
                <p className="text-muted">
                  {SOURCE_TYPE_LABELS[s.sourceType]}
                  {s.organization ? ` · ${s.organization}` : ""}
                  {s.publicationDate ? ` · veröffentlicht am ${formatDate(s.publicationDate)}` : ""}
                  {` · geprüft am ${formatDate(s.verifiedAt)}`}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Keine Quellen veröffentlicht.</p>
        )}
        <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
          Letzte Quellenprüfung: {c.lastVerifiedAt ? formatDateTime(c.lastVerifiedAt) : "–"} · Zuletzt aktualisiert: {formatDateTime(c.updatedAt)}
        </p>
      </Card>

      <ReportContent publicNumber={c.publicNumber} />
    </article>
  );
}
