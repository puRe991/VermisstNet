import Link from "next/link";

export default function RootNotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Seite nicht gefunden</h1>
      <p className="mt-2"><Link href="/">Zur Startseite</Link></p>
    </main>
  );
}
