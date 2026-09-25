import { caseListQuerySchema } from "@/lib/validation/public";
import { apiHandler, json, parseWith, searchParamsObject } from "@/server/http";
import { searchPublicCases } from "@/server/services/public-cases";

export const GET = apiHandler(async ({ req }) => {
  const query = parseWith(caseListQuerySchema, searchParamsObject(req));
  return json(await searchPublicCases(query), 200, { publicCache: true });
});
