import { mediaUpdateSchema } from "@/lib/validation/admin";
import { apiHandler, json, parseWith, readJson, uuidParam } from "@/server/http";
import { deleteMedia, updateMedia } from "@/server/services/media";

export const PATCH = apiHandler<{ id: string }>(async ({ req, actor, params }) => {
  const input = parseWith(mediaUpdateSchema, await readJson(req));
  return json(await updateMedia(actor, uuidParam(params.id, "Medium"), input));
});

export const DELETE = apiHandler<{ id: string }>(async ({ actor, params }) => {
  return json(await deleteMedia(actor, uuidParam(params.id, "Medium")));
});
