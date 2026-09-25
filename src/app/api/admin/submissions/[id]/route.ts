import { decisionSchema } from "@/lib/validation/admin";
import { apiHandler, json, parseWith, readJson, uuidParam } from "@/server/http";
import { decideSubmission, getSubmission } from "@/server/services/moderation";

export const GET = apiHandler<{ id: string }>(async ({ actor, params }) => {
  return json(await getSubmission(actor, uuidParam(params.id, "Meldung")));
});

export const PATCH = apiHandler<{ id: string }>(async ({ req, actor, params }) => {
  const input = parseWith(decisionSchema, await readJson(req));
  return json(await decideSubmission(actor, uuidParam(params.id, "Meldung"), input));
});
