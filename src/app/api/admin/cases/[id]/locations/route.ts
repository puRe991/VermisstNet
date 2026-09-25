import { locationSchema } from "@/lib/validation/admin";
import { apiHandler, json, parseWith, readJson, uuidParam } from "@/server/http";
import { createLocation } from "@/server/services/admin-locations-timeline";

export const POST = apiHandler<{ id: string }>(async ({ req, actor, params }) => {
  const input = parseWith(locationSchema, await readJson(req));
  return json(await createLocation(actor, uuidParam(params.id, "Fall"), input), 201);
});
