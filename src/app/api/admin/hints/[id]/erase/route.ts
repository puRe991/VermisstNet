import { apiHandler, json, uuidParam } from "@/server/http";
import { eraseHintPersonalData } from "@/server/services/moderation";

export const POST = apiHandler<{ id: string }>(async ({ actor, params }) => {
  return json(await eraseHintPersonalData(actor, uuidParam(params.id, "Hinweis")));
});
