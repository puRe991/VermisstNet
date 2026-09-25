import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-2xl font-bold">Seite nicht gefunden</h1>
      <p className="mt-2 text-muted">Der Inhalt existiert nicht oder ist nicht (mehr) öffentlich.</p>
      <div className="mt-6 flex justify-center gap-2">
        <ButtonLink href="/faelle">Zu den Vermisstenfällen</ButtonLink>
      </div>
    </div>
  );
}
