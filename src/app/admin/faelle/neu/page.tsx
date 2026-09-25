import { redirect } from "next/navigation";
import { CaseForm } from "@/components/admin/case-editor/case-form";
import { Card, PageHeader } from "@/components/ui";
import { can } from "@/lib/permissions";
import { getActor } from "@/server/auth/actor";

export default async function NewCasePage() {
  const actor = await getActor();
  if (!can(actor.user?.role, "case.create")) redirect("/admin?forbidden=1");
  return (
    <>
      <PageHeader title="Neuen Fall anlegen" lead="Der Fall wird als Entwurf angelegt. Veröffentlichung erst nach Quellenprüfung." />
      <Card>
        <CaseForm mode="create" />
      </Card>
    </>
  );
}
