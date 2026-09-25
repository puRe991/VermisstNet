import { reportSchema } from "@/lib/validation/public";
import { apiHandler, json, parseWith, readBody } from "@/server/http";
import { submitContentReport } from "@/server/services/intake";

export const POST = apiHandler<{ id: string }>(async ({ req, actor, params }) => {
  const { fields } = await readBody(req);
  const input = parseWith(reportSchema, fields);
  return json(await submitContentReport(actor, params.id, input), 201);
});
