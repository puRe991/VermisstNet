import { adminCaseListSchema, caseCreateSchema } from "@/lib/validation/admin";
import { apiHandler, json, parseWith, readJson, searchParamsObject } from "@/server/http";
import { createCase, listCasesAdmin } from "@/server/services/admin-cases";

export const GET = apiHandler(async ({ req, actor }) => {
  return json(await listCasesAdmin(actor, parseWith(adminCaseListSchema, searchParamsObject(req))));
});

export const POST = apiHandler(async ({ req, actor }) => {
  const input = parseWith(caseCreateSchema, await readJson(req));
  return json(await createCase(actor, input), 201);
});
