import { Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { DECISION_LABELS, ROLE_LABELS } from "@/lib/labels";
import type { DecisionValue, RoleValue } from "@/lib/enums";

type Event = {
  id: string;
  decision: DecisionValue;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  createdAt: Date;
  actor: { displayName: string; role: RoleValue } | null;
};

/** Bearbeitungsverlauf einer Moderationseinheit */
export function History({ events }: { events: Event[] }) {
  if (!events.length) return <p className="text-sm text-muted">Noch keine Bearbeitung.</p>;
  return (
    <ol className="space-y-3">
      {events.map((e) => (
        <li key={e.id} className="rounded-lg border border-line p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={e.decision === "CONFIRM" ? "found" : e.decision === "REJECT" ? "danger" : "neutral"}>
              {DECISION_LABELS[e.decision]}
            </Badge>
            {e.fromStatus !== e.toStatus && e.toStatus && (
              <span className="text-muted">
                {e.fromStatus} → <strong className="text-ink">{e.toStatus}</strong>
              </span>
            )}
          </div>
          <p className="mt-1 text-muted">
            {formatDateTime(e.createdAt)} · {e.actor ? `${ROLE_LABELS[e.actor.role]} ${e.actor.displayName}` : "System"}
          </p>
          {e.note && <p className="mt-1 whitespace-pre-line">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
}
