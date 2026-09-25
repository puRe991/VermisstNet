import type { Metadata } from "next";
import { SubmissionForm } from "@/components/public/submission-form";
import { Alert, Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Vermisstenfall melden" };

export default function SubmitCasePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Neue Vermisstenmeldung" lead="Melden Sie einen Vermisstenfall zur Prüfung. Die Meldung wird nicht automatisch veröffentlicht." />
      <div className="mb-6 space-y-3">
        <Alert tone="urgent" title="Zuerst die Polizei informieren">
          Wenn eine Person vermisst wird, wenden Sie sich bitte umgehend an die Polizei (Notruf 110 oder jede Dienststelle).
          VermisstAtlas ersetzt keine Vermisstenanzeige.
        </Alert>
        <Alert tone="brand" title="So geht es weiter">
          Eingereicht → Prüfung → Quellenprüfung → Freigabe → Veröffentlichung. Fälle von Minderjährigen werden nur mit
          behördlicher Quelle veröffentlicht.
        </Alert>
      </div>
      <Card>
        <SubmissionForm />
      </Card>
    </div>
  );
}
