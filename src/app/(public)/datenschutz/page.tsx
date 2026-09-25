import type { Metadata } from "next";
import { Alert, Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Datenschutz" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Datenschutzhinweise" />
      <Alert tone="warn" title="Vorlage – vor Produktivbetrieb juristisch prüfen und ergänzen">
        Verantwortliche Stelle, Datenschutzbeauftragte, Rechtsgrundlagen und Speicherfristen müssen durch den Betreiber ergänzt werden.
      </Alert>
      <Card>
        <h2 className="text-lg font-semibold">Welche Daten verarbeiten wir?</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li><strong>Hinweise:</strong> Ihre Beobachtung, optionale Anhänge und – nur wenn Sie sie angeben – eine Kontaktmöglichkeit. Kontaktdaten werden verschlüsselt gespeichert und ausschließlich vom Moderationsteam eingesehen. Hinweise werden nie veröffentlicht.</li>
          <li><strong>Vermisstenmeldungen:</strong> Ihre Angaben zur vermissten Person, Quelle und optionale Kontaktmöglichkeit. Eine Veröffentlichung erfolgt erst nach Prüfung.</li>
          <li><strong>Bilder:</strong> Hochgeladene Bilder werden neu kodiert; eingebettete Metadaten (z. B. GPS-Position, Kameradaten) werden dabei entfernt.</li>
          <li><strong>IP-Adressen:</strong> werden nicht im Klartext gespeichert. Zur Missbrauchsabwehr (Rate Limiting) wird ein nicht umkehrbarer, geheimer Hash verwendet und nach Ablauf der Aufbewahrungsfrist gelöscht.</li>
          <li><strong>Konten:</strong> E-Mail-Adresse, Anzeigename, Passwort (nur als Argon2id-Hash), Sitzungscookie (technisch notwendig).</li>
        </ul>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Cookies</h2>
        <p className="mt-2">Es wird ausschließlich ein technisch notwendiges Sitzungscookie für angemeldete Personen verwendet. Keine Tracking- oder Werbecookies.</p>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Kartendienst</h2>
        <p className="mt-2">Kartenkacheln werden von einem Kachelserver (standardmäßig OpenStreetMap) geladen. Dabei wird Ihre IP-Adresse an den Kachelserver übermittelt.</p>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Ihre Rechte</h2>
        <p className="mt-2">Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch und Beschwerde bei einer Aufsichtsbehörde. Personen, die auf VermisstAtlas dargestellt werden (oder deren Angehörige), können jederzeit über „Inhalt melden“ eine Prüfung oder Entfernung verlangen.</p>
      </Card>
    </div>
  );
}
