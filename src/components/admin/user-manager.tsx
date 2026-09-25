"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, type ApiError } from "@/lib/api-client";
import { ROLES, type RoleValue } from "@/lib/enums";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";
import { Badge, Button, Card } from "@/components/ui";
import { Field, FormError } from "@/components/ui/form";

type U = { id: string; email: string; displayName: string; role: RoleValue; isActive: boolean; lastLoginAt: string | null; createdAt: string };

export function UserManager({ users, currentUserId }: { users: U[]; currentUserId: string }) {
  const router = useRouter();
  const [error, setError] = useState<ApiError | null>(null);
  const [createError, setCreateError] = useState<ApiError | null>(null);

  async function update(id: string, data: Partial<Pick<U, "role" | "isActive">>) {
    setError(null);
    const res = await api(`/api/admin/users/${id}`, { method: "PATCH", json: data });
    if (!res.ok) setError(res.error);
    router.refresh();
  }

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);
    const form = e.currentTarget;
    const res = await api("/api/admin/users", { json: Object.fromEntries(new FormData(form).entries()) });
    if (!res.ok) return setCreateError(res.error);
    form.reset();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <FormError error={error} />
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr><th className="p-3">Name</th><th className="p-3">E-Mail</th><th className="p-3">Rolle</th><th className="p-3">Status</th><th className="p-3">Letzte Anmeldung</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-3">{u.displayName}{u.id === currentUserId && <span className="text-muted"> (Sie)</span>}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">
                  <label className="sr-only" htmlFor={`role-${u.id}`}>Rolle von {u.displayName}</label>
                  <select id={`role-${u.id}`} className="input py-1" value={u.role} onChange={(e) => update(u.id, { role: e.target.value as RoleValue })}>
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </td>
                <td className="p-3">{u.isActive ? <Badge tone="found">aktiv</Badge> : <Badge tone="danger">deaktiviert</Badge>}</td>
                <td className="p-3 whitespace-nowrap">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "–"}</td>
                <td className="p-3">
                  <Button variant="secondary" className="min-h-[36px] py-1" onClick={() => update(u.id, { isActive: !u.isActive })}>
                    {u.isActive ? "Deaktivieren" : "Aktivieren"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Card>
        <h2 className="mb-3 text-lg font-semibold">Benutzer anlegen</h2>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2" noValidate>
          <div className="sm:col-span-2"><FormError error={createError} /></div>
          <Field label="Anzeigename" required error={createError?.details?.displayName}>{(p) => <input name="displayName" className="input" required {...p} />}</Field>
          <Field label="E-Mail" required error={createError?.details?.email}>{(p) => <input name="email" type="email" className="input" required {...p} />}</Field>
          <Field label="Initiales Passwort" required error={createError?.details?.password} hint="mind. 10 Zeichen">{(p) => <input name="password" type="password" autoComplete="new-password" className="input" required {...p} />}</Field>
          <Field label="Rolle" required>
            {(p) => (
              <select name="role" className="input" defaultValue="MODERATOR" {...p}>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            )}
          </Field>
          <div className="sm:col-span-2"><Button type="submit">Anlegen</Button></div>
        </form>
      </Card>
    </div>
  );
}
