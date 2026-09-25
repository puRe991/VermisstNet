import { apiHandler, json } from "@/server/http";
import { getOwnActivity } from "@/server/services/auth";

export const GET = apiHandler(async ({ actor }) => {
  const { submissions } = await getOwnActivity(actor);
  return json({ items: submissions });
});
