/** Client-seitiger API-Aufruf mit einheitlicher Fehlerstruktur. */
export type ApiError = { code: string; message: string; details?: Record<string, string[]> };
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError; status: number };

export async function api<T = unknown>(
  path: string,
  init: { method?: string; json?: unknown; form?: FormData } = {},
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: init.method ?? (init.json !== undefined || init.form ? "POST" : "GET"),
      credentials: "same-origin",
      headers: init.json !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.form ?? (init.json !== undefined ? JSON.stringify(init.json) : undefined),
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const error: ApiError = body?.error ?? { code: "INTERNAL_ERROR", message: "Unbekannter Fehler" };
      return { ok: false, error, status: res.status };
    }
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, status: 0, error: { code: "NETWORK", message: "Verbindung fehlgeschlagen. Bitte erneut versuchen." } };
  }
}
