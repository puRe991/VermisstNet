import type { Metadata } from "next";
import { RegisterForm } from "@/components/public/auth-forms";
import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Registrieren", robots: { index: false } };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-bold">Konto anlegen</h1>
      <Card>
        <RegisterForm />
      </Card>
    </div>
  );
}
