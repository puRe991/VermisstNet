import { timelineUpdateSchema } from "@/lib/validation/admin";
import { apiHandler, json, parseWith, readJson, uuidParam } from "@/server/http";
import { deleteTimelineEvent, updateTimelineEvent } from "@/server/services/admin-locations-timeline";

export const PATCH = apiHandler<{ id: string }>(async ({ req, actor, params }) => {
  const input = parseWith(timelineUpdateSchema, await readJson(req));
  return json(await updateTimelineEvent(actor, uuidParam(params.id, "Ereignis"), input));
});

export const DELETE = apiHandler<{ id: string }>(async ({ actor, params }) => {
  return json(await deleteTimelineEvent(actor, uuidParam(params.id, "Ereignis")));
});
