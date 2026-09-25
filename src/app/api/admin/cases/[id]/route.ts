import { caseUpdateSchema } from "@/lib/validation/admin";
import { apiHandler, json, parseWith, readJson, uuidParam } from "@/server/http";
import { getCaseAdmin, updateCase } from "@/server/services/admin-cases";

export const GET = apiHandler<{ id: string }>(async ({ actor, params }) => {
  return json(await getCaseAdmin(actor, uuidParam(params.id, "Fall")));
});

export const PATCH = apiHandler<{ id: string }>(async ({ req, actor, params }) => {
  const input = parseWith(caseUpdateSchema, await readJson(req));
  return json(await updateCase(actor, uuidParam(params.id, "Fall"), input));
});
