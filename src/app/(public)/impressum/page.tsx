import type { Metadata } from "next";
import { Alert, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Impressum" };

export default function ImprintPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Impressum" />
      <Alert tone="warn" title="Vorlage">
        Angaben gemäß § 5 DDG (Name/Anschrift des Betreibers, Kontakt, Vertretungsberechtigte, ggf. Registereintrag) sind vom
        Betreiber zu ergänzen.
      </Alert>
    </div>
  );
}
