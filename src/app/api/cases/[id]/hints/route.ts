import { hintSchema } from "@/lib/validation/public";
import { apiHandler, json, parseWith, readBody } from "@/server/http";
import { submitHint } from "@/server/services/intake";
import { filesFromForm } from "@/server/services/uploads";

export const POST = apiHandler<{ id: string }>(async ({ req, actor, params }) => {
  const { fields, form } = await readBody(req);
  const input = parseWith(hintSchema, fields);
  const files = form ? filesFromForm(form, "attachments") : [];
  return json(await submitHint(actor, params.id, input, files), 201);
});
