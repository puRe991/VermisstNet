import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Über das Projekt" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Über VermisstAtlas" lead="Eine Plattform für verifizierte, verantwortungsvoll dargestellte Vermisstenfälle." />
      <Card>
        <h2 className="text-lg font-semibold">Grundsätze</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li><strong>Verifiziert statt viral:</strong> Veröffentlicht wird nur, was durch mindestens eine geprüfte Quelle belegt ist. Fälle Minderjähriger nur mit behördlicher Quelle.</li>
          <li><strong>Kein Auto-Publish:</strong> Neue Meldungen, Hinweise und Bilder werden immer zuerst von Moderatorinnen und Moderatoren geprüft.</li>
          <li><strong>Hinweise bleiben vertraulich:</strong> Hinweise aus der Bevölkerung werden nie veröffentlicht, sondern geprüft und bei Bedarf an Behörden weitergeleitet.</li>
          <li><strong>Datenminimierung:</strong> Keine Privatadressen, keine exakten Aufenthaltsdaten. Karten zeigen bewusst ungenaue Bereiche.</li>
          <li><strong>Würde der Betroffenen:</strong> Keine Rankings, keine Likes, keine „beliebtesten Fälle“. Nach dem Auffinden einer Person werden Bilder und Details entfernt.</li>
          <li><strong>Nachvollziehbarkeit:</strong> Jede redaktionelle Änderung wird revisionssicher protokolliert.</li>
        </ul>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Automatisch berechnete Informationen</h2>
        <p className="mt-2">
          Entfernungen oder zeitliche Abfolgen zwischen veröffentlichten Orten werden automatisch berechnet und stets als
          „Automatisch berechnet / nicht bestätigt“ gekennzeichnet. VermisstAtlas trifft niemals Aussagen darüber, wo sich
          eine Person tatsächlich aufhält.
        </p>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Wichtig</h2>
        <p className="mt-2">
          VermisstAtlas ersetzt weder den Notruf noch eine Vermisstenanzeige. In akuten Situationen wählen Sie bitte immer
          die <strong>110</strong>.
        </p>
      </Card>
    </div>
  );
}
