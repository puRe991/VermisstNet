"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, type ApiError } from "@/lib/api-client";
import type { DecisionValue } from "@/lib/enums";
import { DECISION_LABELS } from "@/lib/labels";
import { Alert, Button } from "@/components/ui";
import { FormError } from "@/components/ui/form";

/** Moderationsentscheidungen: bestätigen, zurückstellen, Rückfrage, ablehnen, intern weiterleiten. */
export function DecisionPanel({
  endpoint,
  decisions = ["CONFIRM", "DEFER", "REQUEST_INFO", "REJECT", "FORWARD", "ARCHIVE"],
  confirmLabel,
  disabled,
}: {
  endpoint: string;
  decisions?: DecisionValue[];
  confirmLabel?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState<DecisionValue | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function decide(decision: DecisionValue) {
    if (decision === "REJECT" && !window.confirm("Wirklich ablehnen?")) return;
    setBusy(decision);
    setError(null);
    const res = await api<{ status: string; case?: { publicNumber: string } | null }>(endpoint, {
      method: "PATCH",
      json: { decision, note: note || undefined, assignToMe: true },
    });
    setBusy(null);
    if (!res.ok) return setError(res.error);
    setNote("");
    setDone(
      `${DECISION_LABELS[decision]} gespeichert (Status: ${res.data.status})` +
        (res.data.case ? ` – Fallentwurf ${res.data.case.publicNumber} angelegt` : ""),
    );
    router.refresh();
  }

  const tone = (d: DecisionValue) => (d === "CONFIRM" ? "primary" : d === "REJECT" ? "danger" : "secondary");

  return (
    <div className="space-y-3">
      <FormError error={error} />
      {done && <Alert tone="found" title={done} />}
      <label className="block text-sm font-semibold" htmlFor="decision-note">
        Interne Notiz (optional)
      </label>
      <textarea
        id="decision-note"
        className="input"
        rows={3}
        maxLength={3000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Begründung, Rückfrage, Weiterleitungsziel …"
      />
      <div className="flex flex-wrap gap-2">
        {decisions.map((d) => (
          <Button key={d} type="button" variant={tone(d)} disabled={disabled || busy !== null} onClick={() => decide(d)}>
            {busy === d ? "…" : d === "CONFIRM" && confirmLabel ? confirmLabel : DECISION_LABELS[d]}
          </Button>
        ))}
        <Button type="button" variant="ghost" disabled={!note || busy !== null} onClick={() => decide("NOTE")}>
          Nur Notiz speichern
        </Button>
      </div>
    </div>
  );
}
