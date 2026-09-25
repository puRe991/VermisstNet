import { hintListSchema } from "@/lib/validation/admin";
import { apiHandler, json, parseWith, searchParamsObject } from "@/server/http";
import { listHints } from "@/server/services/moderation";

export const GET = apiHandler(async ({ req, actor }) => {
  return json(await listHints(actor, parseWith(hintListSchema, searchParamsObject(req))));
});
