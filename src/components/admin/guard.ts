import "server-only";
import { notFound, redirect } from "next/navigation";
import { AppError } from "@/server/errors";

/** Übersetzt Service-Fehler in Next-Navigation (404 / Login / Konto). */
export async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === "NOT_FOUND") notFound();
      if (err.code === "UNAUTHENTICATED") redirect("/anmelden?next=/admin");
      if (err.code === "FORBIDDEN") redirect("/admin?forbidden=1");
    }
    throw err;
  }
}
