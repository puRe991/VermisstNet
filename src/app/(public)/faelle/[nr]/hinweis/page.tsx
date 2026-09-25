import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HintForm } from "@/components/public/hint-form";
import { Alert, Card } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { AppError } from "@/server/errors";
import { getPublicCase } from "@/server/services/public-cases";

export const metadata: Metadata = { title: "Hinweis melden", robots: { index: false } };

export default async function HintPage({ params }: { params: Promise<{ nr: string }> }) {
  const { nr } = await params;
  let c;
  try {
    c = await getPublicCase(decodeURIComponent(nr));
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm">
          <Link href={`/faelle/${c.publicNumber}`}>← Zurück zum Fall</Link>
        </p>
        <h1 className="mt-2 text-2xl font-bold">Hinweis zu diesem Fall melden</h1>
        <p className="mt-1 text-muted">
          {c.displayName ?? c.headline} · vermisst seit {formatDate(c.missingSince)} · {c.place} · {c.publicNumber}
        </p>
      </div>
      <Alert tone="urgent" title="Akute Gefahr oder Person gerade gesehen?">
        Rufen Sie sofort den Notruf <strong>110</strong> an. Dieses Formular ersetzt keinen Notruf.
      </Alert>
      {c.status !== "ACTIVE" ? (
        <Alert tone="neutral" title="Für diesen Fall werden keine Hinweise mehr entgegengenommen." />
      ) : (
        <Card>
          <HintForm publicNumber={c.publicNumber} />
        </Card>
      )}
    </div>
  );
}
