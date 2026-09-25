import { z } from "zod";
import { notFound } from "@/server/errors";
import { apiHandler } from "@/server/http";
import { getMediaFile } from "@/server/services/media";

export const GET = apiHandler<{ id: string }>(async ({ req, actor, params }) => {
  if (!z.uuid().safeParse(params.id).success) throw notFound("Datei");
  const variant = req.nextUrl.searchParams.get("variant") === "thumb" ? "thumb" : "full";
  const file = await getMediaFile(actor, params.id, variant);
  return new Response(new Uint8Array(file.data), {
    status: 200,
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.data.length),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; sandbox",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Cache-Control": file.isPublic ? "public, max-age=300, s-maxage=300" : "private, no-store",
      // Videos (nur intern) nie inline im Browser-Kontext ausführen
      "Content-Disposition": file.isVideo ? "attachment" : "inline",
    },
  });
});
