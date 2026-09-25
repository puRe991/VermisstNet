import type { Metadata } from "next";
import { CaseCard } from "@/components/public/case-card";
import { CaseFilterForm } from "@/components/public/case-filter-form";
import { Alert, EmptyState, PageHeader, Pagination } from "@/components/ui";
import { caseListQuerySchema, formEntriesToObject } from "@/lib/validation/public";
import { searchPublicCases } from "@/server/services/public-cases";

export const metadata: Metadata = { title: "Vermisstenfälle" };

type SP = Promise<Record<string, string | string[] | undefined>>;

function toEntries(sp: Record<string, string | string[] | undefined>): [string, string][] {
  return Object.entries(sp).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x] as [string, string]) : v ? [[k, v] as [string, string]] : []));
}

export default async function CasesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const entries = toEntries(sp);
  const parsed = caseListQuerySchema.safeParse(formEntriesToObject(entries));
  const query = parsed.success ? parsed.data : caseListQuerySchema.parse({});
  const result = await searchPublicCases(query);

  const hrefFor = (page: number) => {
    const params = new URLSearchParams(entries.filter(([k]) => k !== "page"));
    params.set("page", String(page));
    return `/faelle?${params.toString()}`;
  };

  return (
    <>
      <PageHeader title="Vermisstenfälle" lead="Suchen und filtern Sie veröffentlichte, verifizierte Vermisstenfälle." />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside>
          <CaseFilterForm values={Object.fromEntries(entries)} statuses={query.status ?? ["ACTIVE"]} genders={query.gender ?? []} />
        </aside>
        <section aria-live="polite">
          {!parsed.success && (
            <div className="mb-4">
              <Alert tone="warn" title="Einige Filter waren ungültig und wurden ignoriert." />
            </div>
          )}
          <p className="mb-3 text-sm text-muted">
            {result.total === 1 ? "1 Fall gefunden" : `${result.total} Fälle gefunden`}
          </p>
          {result.items.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {result.items.map((c) => (
                <CaseCard key={c.publicNumber} c={c} />
              ))}
            </div>
          ) : (
            <EmptyState title="Keine Fälle gefunden">Passen Sie Suchbegriff oder Filter an.</EmptyState>
          )}
          <Pagination page={result.page} totalPages={result.totalPages} hrefFor={hrefFor} />
        </section>
      </div>
    </>
  );
}
