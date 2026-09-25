import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-strong border border-transparent",
  secondary: "bg-surface text-ink border border-line hover:bg-canvas",
  ghost: "bg-transparent text-brand hover:bg-brand-soft border border-transparent",
  danger: "bg-danger text-white hover:opacity-90 border border-transparent",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]";

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cx(BASE, VARIANTS[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cx(BASE, VARIANTS[variant], "no-underline", className)} {...props} />;
}

type Tone = "neutral" | "brand" | "urgent" | "found" | "danger" | "warn";
const TONES: Record<Tone, string> = {
  neutral: "bg-canvas text-muted border-line",
  brand: "bg-brand-soft text-brand border-brand/20",
  urgent: "bg-urgent-soft text-urgent border-urgent/20",
  found: "bg-found-soft text-found border-found/20",
  danger: "bg-danger-soft text-danger border-danger/20",
  warn: "bg-warn-soft text-warn border-warn/20",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function Card({ children, className, as: As = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <As className={cx("rounded-xl border border-line bg-surface p-4 sm:p-6", className)}>{children}</As>;
}

export function Alert({ tone = "brand", title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("rounded-lg border p-4 text-sm", TONES[tone])}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-1" : undefined}>{children}</div>}
    </div>
  );
}

export function DemoBadge() {
  return (
    <Badge tone="warn" className="uppercase tracking-wide">
      Demo Data
    </Badge>
  );
}

export function PageHeader({ title, lead, children }: { title: string; lead?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {lead && <p className="mt-1 max-w-2xl text-muted">{lead}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function DefinitionList({ items }: { items: { label: string; value: ReactNode }[] }) {
  const visible = items.filter((i) => i.value !== null && i.value !== undefined && i.value !== "");
  if (!visible.length) return null;
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {visible.map((i) => (
        <div key={i.label}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{i.label}</dt>
          <dd className="mt-0.5 whitespace-pre-line">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Pagination über Query-Parameter (funktioniert ohne JavaScript) */
export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Seitennavigation" className="mt-6 flex items-center justify-center gap-2">
      {page > 1 ? (
        <ButtonLink variant="secondary" href={hrefFor(page - 1)} rel="prev">
          ← Zurück
        </ButtonLink>
      ) : (
        <span />
      )}
      <span className="px-3 text-sm text-muted">
        Seite {page} von {totalPages}
      </span>
      {page < totalPages && (
        <ButtonLink variant="secondary" href={hrefFor(page + 1)} rel="next">
          Weiter →
        </ButtonLink>
      )}
    </nav>
  );
}
