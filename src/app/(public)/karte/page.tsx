import type { Metadata } from "next";
import { MapExplorer } from "@/components/public/map-explorer";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Karte" };

export default function MapPage() {
  return (
    <>
      <PageHeader title="Karte" lead="Aktive, veröffentlichte Vermisstenfälle. Dargestellt werden nur freigegebene, generalisierte Ortsangaben." />
      <MapExplorer />
    </>
  );
}
