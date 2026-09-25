import { decisionSchema } from "@/lib/validation/admin";
import { apiHandler, json, parseWith, readJson, uuidParam } from "@/server/http";
import { decideHint, getHint } from "@/server/services/moderation";

export const GET = apiHandler<{ id: string }>(async ({ actor, params }) => {
  return json(await getHint(actor, uuidParam(params.id, "Hinweis")));
});

export const PATCH = apiHandler<{ id: string }>(async ({ req, actor, params }) => {
  const input = parseWith(decisionSchema, await readJson(req));
  return json(await decideHint(actor, uuidParam(params.id, "Hinweis"), input));
});
