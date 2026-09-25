"use client";

import { Button } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-2xl font-bold">Es ist ein Fehler aufgetreten</h1>
      <p className="mt-2 text-muted">Bitte versuchen Sie es erneut. Bei akuter Gefahr: Notruf 110.</p>
      <Button className="mt-6" onClick={() => reset()}>Erneut versuchen</Button>
    </div>
  );
}
