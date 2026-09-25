import { apiHandler, json, uuidParam } from "@/server/http";
import { eraseSubmissionPersonalData } from "@/server/services/moderation";

export const POST = apiHandler<{ id: string }>(async ({ actor, params }) => {
  return json(await eraseSubmissionPersonalData(actor, uuidParam(params.id, "Meldung")));
});
