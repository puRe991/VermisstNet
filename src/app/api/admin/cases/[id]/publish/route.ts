import { apiHandler, json, uuidParam } from "@/server/http";
import { publishCase } from "@/server/services/admin-cases";

export const POST = apiHandler<{ id: string }>(async ({ actor, params }) => {
  return json(await publishCase(actor, uuidParam(params.id, "Fall")));
});
