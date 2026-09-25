"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui";

export function SourceVerifyButtons({ id, verified, canDelete }: { id: string; verified: boolean; canDelete?: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(path: string, init: Parameters<typeof api>[1]) {
    setBusy(true);
    const res = await api(path, init);
    setBusy(false);
    setMsg(res.ok ? null : res.error.message);
    router.refresh();
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {verified ? (
        <Button variant="secondary" disabled={busy} onClick={() => run(`/api/admin/sources/${id}/verify`, { json: { verified: false } })}>
          Verifizierung entziehen
        </Button>
      ) : (
        <Button disabled={busy} onClick={() => run(`/api/admin/sources/${id}/verify`, { json: { verified: true } })}>
          Als verifiziert markieren
        </Button>
      )}
      {canDelete && (
        <Button variant="ghost" disabled={busy} onClick={() => window.confirm("Quelle löschen?") && run(`/api/admin/sources/${id}`, { method: "DELETE" })}>
          Löschen
        </Button>
      )}
      {msg && <span className="text-sm text-danger" role="alert">{msg}</span>}
    </div>
  );
}
