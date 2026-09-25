import { apiHandler, json } from "@/server/http";
import { getPublicTimeline } from "@/server/services/public-cases";

export const GET = apiHandler<{ id: string }>(async ({ params }) => {
  return json({ items: await getPublicTimeline(params.id) }, 200, { publicCache: true });
});
