"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui";

export function EraseButton({ endpoint }: { endpoint: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted">Löscht Kontaktdaten, IP-Hash, Freitext und Anhänge unwiderruflich. Der Vorgang wird protokolliert.</p>
      <Button
        variant="danger"
        onClick={async () => {
          if (!window.confirm("Personenbezogene Daten unwiderruflich löschen?")) return;
          const res = await api(endpoint, { method: "POST" });
          setMsg(res.ok ? "Gelöscht." : res.error.message);
          router.refresh();
        }}
      >
        Personenbezogene Daten löschen
      </Button>
      {msg && <p role="status">{msg}</p>}
    </div>
  );
}
