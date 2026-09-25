import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { CaseCard } from "@/components/public/case-card";
import { latestPublicCases } from "@/server/services/public-cases";

export default async function HomePage() {
  const latest = await latestPublicCases(6);
  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-brand px-5 py-10 text-white sm:px-10 sm:py-14">
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
          Verifizierte Vermisstenfälle – nachvollziehbar und verantwortungsvoll
        </h1>
        <p className="mt-3 max-w-2xl text-white/85">
          VermisstAtlas bündelt öffentlich freigegebene Informationen zu Vermisstenfällen mit geprüften Quellen. Hinweise
          werden vertraulich an ein Moderationsteam übermittelt.
        </p>
        <form action="/faelle" method="get" role="search" className="mt-8 flex max-w-2xl flex-col gap-2 sm:flex-row">
          <label htmlFor="hero-q" className="sr-only">
            Nach Name, Ort oder Fallnummer suchen
          </label>
          <input
            id="hero-q"
            name="q"
            type="search"
            placeholder="Nach Name, Ort oder Fallnummer suchen"
            className="min-h-[52px] flex-1 rounded-lg border-0 bg-white px-4 text-base text-ink placeholder:text-muted shadow-sm"
            autoComplete="off"
          />
          <button type="submit" className="min-h-[52px] rounded-lg bg-white px-6 font-semibold text-brand hover:bg-brand-soft">
            Suchen
          </button>
        </form>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/faelle" variant="secondary" className="bg-white/10 text-white border-white/30 hover:bg-white/20">
            Vermisstenfälle ansehen
          </ButtonLink>
          <ButtonLink href="/hinweis" variant="secondary" className="bg-white text-brand hover:bg-brand-soft">
            Hinweis melden
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="neueste">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 id="neueste" className="text-xl font-bold">
            Aktuelle Vermisstenfälle
          </h2>
          <Link href="/faelle" className="text-sm font-semibold">
            Alle Fälle →
          </Link>
        </div>
        {latest.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((c) => (
              <CaseCard key={c.publicNumber} c={c} />
            ))}
          </div>
        ) : (
          <p className="text-muted">Derzeit sind keine aktiven Fälle veröffentlicht.</p>
        )}
        <p className="mt-3 text-xs text-muted">Sortiert nach Datum des Verschwindens (neueste zuerst).</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Grundsätze">
        {[
          ["Geprüfte Quellen", "Jeder veröffentlichte Fall ist mit mindestens einer verifizierten Quelle belegt – sichtbar auf jeder Fallseite."],
          ["Vertrauliche Hinweise", "Hinweise werden niemals veröffentlicht, sondern von einem Moderationsteam geprüft und bei Bedarf an Behörden weitergeleitet."],
          ["Datenschutz zuerst", "Keine Privatadressen, keine genauen Aufenthaltsdaten, besonderer Schutz von Minderjährigen."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-xl border border-line bg-surface p-5">
            <h3 className="font-semibold">{t}</h3>
            <p className="mt-1 text-sm text-muted">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
