"use client";

import { useId, type ReactNode } from "react";
import type { ApiError } from "@/lib/api-client";
import { Alert, cx } from "./index";

export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  error?: string[] | string;
  hint?: ReactNode;
  required?: boolean;
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const errors = typeof error === "string" ? [error] : error;
  const describedBy = [hint ? `${id}-hint` : null, errors?.length ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children({ id, "aria-invalid": errors?.length ? true : undefined, "aria-describedby": describedBy })}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {errors?.length ? (
        <p id={`${id}-err`} className="text-sm text-danger">
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ error }: { error: ApiError | null }) {
  if (!error) return null;
  const general = error.details?._?.join(" ");
  return (
    <Alert tone="danger" title={error.message}>
      {general}
    </Alert>
  );
}

/** Honeypot gegen Spam-Bots – für Menschen unsichtbar */
export function Honeypot() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
