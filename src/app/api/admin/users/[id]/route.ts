import { userUpdateSchema } from "@/lib/validation/admin";
import { apiHandler, json, parseWith, readJson, uuidParam } from "@/server/http";
import { updateUser } from "@/server/services/admin-users";

export const PATCH = apiHandler<{ id: string }>(async ({ req, actor, params }) => {
  const input = parseWith(userUpdateSchema, await readJson(req));
  return json(await updateUser(actor, uuidParam(params.id, "Benutzer"), input));
});
