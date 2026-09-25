import { mediaUploadSchema } from "@/lib/validation/admin";
import { requireStaff } from "@/server/auth/actor";
import { validation } from "@/server/errors";
import { apiHandler, json, parseWith, readBody } from "@/server/http";
import { uploadCaseMedia } from "@/server/services/media";
import { filesFromForm } from "@/server/services/uploads";

export const POST = apiHandler(async ({ req, actor }) => {
  // Berechtigung vor dem Einlesen großer Uploads prüfen (verhindert Ressourcenmissbrauch)
  requireStaff(actor, "media.upload");
  const { fields, form } = await readBody(req);
  const input = parseWith(mediaUploadSchema, fields);
  const [file] = form ? filesFromForm(form, "file") : [];
  if (!file) throw validation("Datei fehlt", { file: ["Bitte eine Bilddatei auswählen"] });
  return json(await uploadCaseMedia(actor, input, file), 201);
});
