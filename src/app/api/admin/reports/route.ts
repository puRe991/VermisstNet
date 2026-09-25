import { reportListSchema } from "@/lib/validation/admin";
import { apiHandler, json, parseWith, searchParamsObject } from "@/server/http";
import { listReports } from "@/server/services/moderation";

export const GET = apiHandler(async ({ req, actor }) => {
  return json(await listReports(actor, parseWith(reportListSchema, searchParamsObject(req))));
});
