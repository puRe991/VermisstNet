import Link from "next/link";
import { CaseForm } from "@/components/admin/case-editor/case-form";
import { LocationsPanel } from "@/components/admin/case-editor/locations-panel";
import { MediaPanel } from "@/components/admin/case-editor/media-panel";
import { SourcesPanel } from "@/components/admin/case-editor/sources-panel";
import { StatusPanel } from "@/components/admin/case-editor/status-panel";
import { TimelinePanel } from "@/components/admin/case-editor/timeline-panel";
import { guard } from "@/components/admin/guard";
import { History } from "@/components/admin/history";
import { Alert, Card, DemoBadge, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { can } from "@/lib/permissions";
import { getActor } from "@/server/auth/actor";
import { uuidParam } from "@/server/http";
import { getCaseAdmin } from "@/server/services/admin-cases";

export default async function AdminCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  const c = await guard(async () => getCaseAdmin(actor, uuidParam(id)));
  const role = actor.user!.role;
  const perms = {
    canEdit: can(role, "case.update"),
    canStatus: can(role, "case.status.change"),
    canPublish: can(role, "case.publish"),
    canLocations: can(role, "location.manage"),
    canCreateSource: can(role, "source.create"),
    canVerifySource: can(role, "source.verify"),
    canDeleteSource: can(role, "source.delete"),
    canTimeline: can(role, "timeline.create"),
    canDeleteTimeline: can(role, "timeline.delete"),
    canMedia: can(role, "media.manage"),
  };
  const sources = c.sources.map((s) => ({ id: s.id, title: s.title }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${c.publicNumber} · ${c.person.firstName} ${c.person.lastName ?? ""}`}
        lead={<>Öffentliche Anzeige: <strong>{c.computed.publicDisplayName ?? "anonymisiert"}</strong> · Alter: {c.computed.age ?? "unbekannt"}{c.computed.isMinor ? " · besonders schutzbedürftig" : ""} · angelegt {formatDateTime(c.createdAt)}{c.createdBy ? ` von ${c.createdBy.displayName}` : ""}</>}
      >
        {c.isDemo && <DemoBadge />}
        {c.publicationStatus === "PUBLISHED" && c.status !== "ARCHIVED" && (
          <Link href={`/faelle/${c.publicNumber}`} target="_blank" className="text-sm">Öffentliche Seite ansehen ↗</Link>
        )}
      </PageHeader>

      {c.submission && (
        <Alert tone="brand" title={`Aus Meldung ${c.submission.referenceCode} übernommen`}>
          <Link href={`/admin/meldungen/${c.submission.id}`}>Zur Meldung</Link>
        </Alert>
      )}
      {c._count.hints > 0 && (
        <Alert tone="neutral" title={`${c._count.hints} Hinweis(e) zu diesem Fall`}>
          <Link href={`/admin/hinweise?case=${c.publicNumber}`}>Hinweise ansehen</Link>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Stammdaten</h2>
            <CaseForm mode="edit" caseId={c.id} initial={c} readOnly={!perms.canEdit} />
          </Card>
          <Card>
            <h2 id="quellen" className="mb-4 text-lg font-semibold">Quellen</h2>
            <SourcesPanel caseId={c.id} sources={c.sources} canCreate={perms.canCreateSource} canVerify={perms.canVerifySource} canDelete={perms.canDeleteSource} />
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Suchbilder & Medien</h2>
            <MediaPanel caseId={c.id} media={c.media} canManage={perms.canMedia} />
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Orte</h2>
            <LocationsPanel caseId={c.id} locations={c.locations} sources={sources} canEdit={perms.canLocations} />
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Chronologie</h2>
            <TimelinePanel
              caseId={c.id}
              events={c.timelineEvents}
              sources={sources}
              locations={c.locations.map((l) => ({ id: l.id, label: l.label }))}
              canCreate={perms.canTimeline}
              canDelete={perms.canDeleteTimeline}
            />
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Status & Veröffentlichung</h2>
            <StatusPanel
              caseId={c.id}
              status={c.status}
              isUrgent={c.isUrgent}
              publicationStatus={c.publicationStatus}
              readiness={c.publishCheck}
              canStatus={perms.canStatus}
              canPublish={perms.canPublish}
            />
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Verlauf</h2>
            <History events={c.history} />
            {can(role, "audit.read") && (
              <p className="mt-3 text-sm"><Link href={`/admin/audit?entityType=Case&entityId=${c.id}`}>Vollständiges Audit-Log</Link></p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
