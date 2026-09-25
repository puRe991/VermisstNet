import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/public/auth-forms";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { HINT_STATUS_LABELS, HINT_TYPE_LABELS, ROLE_LABELS, SUBMISSION_STATUS_LABELS } from "@/lib/labels";
import { getActor } from "@/server/auth/actor";
import { getOwnActivity } from "@/server/services/auth";

export const metadata: Metadata = { title: "Mein Konto", robots: { index: false } };

export default async function AccountPage() {
  const actor = await getActor();
  if (!actor.user) redirect("/anmelden?next=/konto");
  const { submissions, hints } = await getOwnActivity(actor);
  return (
    <div className="space-y-6">
      <PageHeader title="Mein Konto" lead={`${actor.user.displayName} · ${ROLE_LABELS[actor.user.role]}`}>
        <LogoutButton />
      </PageHeader>
      <Card>
        <h2 className="mb-3 text-lg font-semibold">Meine Vermisstenmeldungen</h2>
        {submissions.length ? (
          <ul className="divide-y divide-line">
            {submissions.map((s) => (
              <li key={s.referenceCode} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span><span className="font-mono">{s.referenceCode}</span> · {s.personName}</span>
                <span className="flex items-center gap-2 text-muted">
                  {formatDateTime(s.createdAt)} <Badge tone="brand">{SUBMISSION_STATUS_LABELS[s.status]}</Badge>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Keine Meldungen" />
        )}
      </Card>
      <Card>
        <h2 className="mb-3 text-lg font-semibold">Meine Hinweise</h2>
        <p className="mb-3 text-xs text-muted">Anonym gesendete Hinweise werden bewusst nicht mit Ihrem Konto verknüpft und erscheinen hier nicht.</p>
        {hints.length ? (
          <ul className="divide-y divide-line">
            {hints.map((h) => (
              <li key={h.referenceCode} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span><span className="font-mono">{h.referenceCode}</span> · {HINT_TYPE_LABELS[h.hintType]} · {h.publicNumber}</span>
                <span className="flex items-center gap-2 text-muted">
                  {formatDateTime(h.createdAt)} <Badge tone="brand">{HINT_STATUS_LABELS[h.status]}</Badge>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Keine Hinweise" />
        )}
      </Card>
    </div>
  );
}
