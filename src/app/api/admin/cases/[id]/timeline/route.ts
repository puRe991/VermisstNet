import { timelineSchema } from "@/lib/validation/admin";
import { apiHandler, json, parseWith, readJson, uuidParam } from "@/server/http";
import { createTimelineEvent } from "@/server/services/admin-locations-timeline";

export const POST = apiHandler<{ id: string }>(async ({ req, actor, params }) => {
  const input = parseWith(timelineSchema, await readJson(req));
  return json(await createTimelineEvent(actor, uuidParam(params.id, "Fall"), input), 201);
});
