import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { searchPublicCases } from "@/server/services/public-cases";

export const metadata: Metadata = { title: "Hinweis melden" };

export default async function HintLandingPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.slice(0, 200) : "";
  const result = await searchPublicCases({ q: query || undefined, status: ["ACTIVE"], page: 1, pageSize: 20 });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Hinweis melden" lead="Wählen Sie den Fall aus, zu dem Sie einen Hinweis geben möchten. Hinweise werden vertraulich geprüft und nie veröffentlicht." />
      <div className="mb-6">
        <Alert tone="urgent" title="Akute Gefahr oder Person gerade gesehen?">
          Rufen Sie sofort den Notruf <strong>110</strong> an.
        </Alert>
      </div>
      <form action="/hinweis" method="get" role="search" className="mb-6 flex gap-2">
        <label htmlFor="hq" className="sr-only">Fall suchen</label>
        <input id="hq" name="q" type="search" defaultValue={query} className="input" placeholder="Name, Ort oder Fallnummer" />
        <button type="submit" className="min-h-[44px] rounded-lg bg-brand px-4 font-semibold text-white">Suchen</button>
      </form>
      {result.items.length ? (
        <ul className="space-y-3">
          {result.items.map((c) => (
            <li key={c.publicNumber}>
              <Card as="div" className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{c.displayName ?? c.headline}</p>
                  <p className="text-sm text-muted">
                    {c.place} · vermisst seit {formatDate(c.missingSince)} · {c.publicNumber}
                  </p>
                </div>
                <Link href={`/faelle/${c.publicNumber}/hinweis`} className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white no-underline">
                  Hinweis zu diesem Fall
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Kein passender aktiver Fall gefunden">
          Möchten Sie eine Person als vermisst melden? <Link href="/melden">Vermisstenfall melden</Link>
        </EmptyState>
      )}
    </div>
  );
}
