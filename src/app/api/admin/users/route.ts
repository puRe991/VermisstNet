import { userCreateSchema } from "@/lib/validation/admin";
import { apiHandler, json, parseWith, readJson } from "@/server/http";
import { createUser, listUsers } from "@/server/services/admin-users";

export const GET = apiHandler(async ({ actor }) => json({ items: await listUsers(actor) }));

export const POST = apiHandler(async ({ req, actor }) => {
  const input = parseWith(userCreateSchema, await readJson(req));
  return json(await createUser(actor, input), 201);
});
