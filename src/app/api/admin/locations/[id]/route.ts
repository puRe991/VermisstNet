import { locationUpdateSchema } from "@/lib/validation/admin";
import { apiHandler, json, parseWith, readJson, uuidParam } from "@/server/http";
import { deleteLocation, updateLocation } from "@/server/services/admin-locations-timeline";

export const PATCH = apiHandler<{ id: string }>(async ({ req, actor, params }) => {
  const input = parseWith(locationUpdateSchema, await readJson(req));
  return json(await updateLocation(actor, uuidParam(params.id, "Ort"), input));
});

export const DELETE = apiHandler<{ id: string }>(async ({ actor, params }) => {
  return json(await deleteLocation(actor, uuidParam(params.id, "Ort")));
});
