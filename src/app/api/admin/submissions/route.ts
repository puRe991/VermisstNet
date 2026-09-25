import { submissionListSchema } from "@/lib/validation/admin";
import { apiHandler, json, parseWith, searchParamsObject } from "@/server/http";
import { listSubmissions } from "@/server/services/moderation";

export const GET = apiHandler(async ({ req, actor }) => {
  return json(await listSubmissions(actor, parseWith(submissionListSchema, searchParamsObject(req))));
});
