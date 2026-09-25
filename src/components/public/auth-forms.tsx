"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, type ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui";
import { Field, FormError, Honeypot } from "@/components/ui/form";

/** Nur interne, relative Weiterleitungsziele erlauben (Schutz vor Open Redirect). */
function safeNext(next: string | null | undefined, fallback: string): string {
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) return next;
  return fallback;
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await api<{ user: { role: string } }>("/api/auth/login", { json: Object.fromEntries(fd.entries()) });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    const staff = ["MODERATOR", "EDITOR", "ADMINISTRATOR"].includes(res.data.user.role);
    router.replace(safeNext(next, staff ? "/admin" : "/konto"));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormError error={error} />
      <Field label="E-Mail" required error={error?.details?.email}>
        {(p) => <input name="email" type="email" autoComplete="username" required className="input" {...p} />}
      </Field>
      <Field label="Passwort" required error={error?.details?.password}>
        {(p) => <input name="password" type="password" autoComplete="current-password" required className="input" {...p} />}
      </Field>
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Anmeldung …" : "Anmelden"}</Button>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await api("/api/auth/register", { json: Object.fromEntries(fd.entries()) });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.replace("/konto");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-4" noValidate>
      <FormError error={error} />
      <Field label="Anzeigename" required error={error?.details?.displayName}>
        {(p) => <input name="displayName" autoComplete="nickname" required maxLength={60} className="input" {...p} />}
      </Field>
      <Field label="E-Mail" required error={error?.details?.email}>
        {(p) => <input name="email" type="email" autoComplete="email" required className="input" {...p} />}
      </Field>
      <Field label="Passwort" required error={error?.details?.password} hint="Mindestens 10 Zeichen">
        {(p) => <input name="password" type="password" autoComplete="new-password" required minLength={10} className="input" {...p} />}
      </Field>
      <Honeypot />
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Wird angelegt …" : "Konto anlegen"}</Button>
    </form>
  );
}

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      className={className}
      onClick={async () => {
        await api("/api/auth/logout", { method: "POST" });
        router.replace("/");
        router.refresh();
      }}
    >
      Abmelden
    </Button>
  );
}
