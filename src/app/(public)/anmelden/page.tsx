import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/public/auth-forms";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Anmelden", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-bold">Anmelden</h1>
      <Card>
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </Card>
      <p className="mt-4 text-sm text-muted">
        Noch kein Konto? <Link href="/registrieren">Registrieren</Link> – mit einem Konto können Sie den Status Ihrer
        Meldungen und Hinweise verfolgen. Hinweise sind auch ohne Konto möglich.
      </p>
    </div>
  );
}
