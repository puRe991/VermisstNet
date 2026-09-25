import { auditListSchema } from "@/lib/validation/admin";
import { apiHandler, json, parseWith, searchParamsObject } from "@/server/http";
import { listAudit } from "@/server/services/admin-users";

export const GET = apiHandler(async ({ req, actor }) => {
  return json(await listAudit(actor, parseWith(auditListSchema, searchParamsObject(req))));
});
