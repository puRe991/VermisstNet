import { sourceSchema } from "@/lib/validation/admin";
import { apiHandler, json, parseWith, readJson, uuidParam } from "@/server/http";
import { createSource } from "@/server/services/admin-sources";

export const POST = apiHandler<{ id: string }>(async ({ req, actor, params }) => {
  const input = parseWith(sourceSchema, await readJson(req));
  return json(await createSource(actor, uuidParam(params.id, "Fall"), input), 201);
});
