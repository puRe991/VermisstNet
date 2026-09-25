import { sourceVerifySchema } from "@/lib/validation/admin";
import { apiHandler, json, parseWith, readJson, uuidParam } from "@/server/http";
import { verifySource } from "@/server/services/admin-sources";

export const POST = apiHandler<{ id: string }>(async ({ req, actor, params }) => {
  const input = parseWith(sourceVerifySchema, await readJson(req));
  return json(await verifySource(actor, uuidParam(params.id, "Quelle"), input));
});
