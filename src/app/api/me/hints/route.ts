import { apiHandler, json } from "@/server/http";
import { getOwnActivity } from "@/server/services/auth";

export const GET = apiHandler(async ({ actor }) => {
  const { hints } = await getOwnActivity(actor);
  return json({ items: hints });
});
