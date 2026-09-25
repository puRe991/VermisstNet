import { SiteFooter, SiteHeader } from "@/components/public/site-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="inhalt" className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
