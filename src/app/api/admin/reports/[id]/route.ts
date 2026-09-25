import { decisionSchema } from "@/lib/validation/admin";
import { apiHandler, json, parseWith, readJson, uuidParam } from "@/server/http";
import { decideReport, getReport } from "@/server/services/moderation";

export const GET = apiHandler<{ id: string }>(async ({ actor, params }) => {
  return json(await getReport(actor, uuidParam(params.id)));
});

export const PATCH = apiHandler<{ id: string }>(async ({ req, actor, params }) => {
  const input = parseWith(decisionSchema, await readJson(req));
  return json(await decideReport(actor, uuidParam(params.id), input));
});
