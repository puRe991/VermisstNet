import { guard } from "@/components/admin/guard";
import { UserManager } from "@/components/admin/user-manager";
import { PageHeader } from "@/components/ui";
import { getActor } from "@/server/auth/actor";
import { listUsers } from "@/server/services/admin-users";

export default async function UsersPage() {
  const actor = await getActor();
  const users = await guard(() => listUsers(actor));
  return (
    <>
      <PageHeader title="Benutzer & Rollen" lead="Rollenänderungen und Deaktivierungen beenden alle Sitzungen des Benutzers sofort." />
      <UserManager
        currentUserId={actor.user!.id}
        users={users.map((u) => ({ ...u, lastLoginAt: u.lastLoginAt?.toISOString() ?? null, createdAt: u.createdAt.toISOString() }))}
      />
    </>
  );
}
