import { sourceUpdateSchema } from "@/lib/validation/admin";
import { apiHandler, json, parseWith, readJson, uuidParam } from "@/server/http";
import { deleteSource, updateSource } from "@/server/services/admin-sources";

export const PATCH = apiHandler<{ id: string }>(async ({ req, actor, params }) => {
  const input = parseWith(sourceUpdateSchema, await readJson(req));
  return json(await updateSource(actor, uuidParam(params.id, "Quelle"), input));
});

export const DELETE = apiHandler<{ id: string }>(async ({ actor, params }) => {
  return json(await deleteSource(actor, uuidParam(params.id, "Quelle")));
});
