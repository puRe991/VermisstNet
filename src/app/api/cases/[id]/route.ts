import { apiHandler, json } from "@/server/http";
import { getPublicCase } from "@/server/services/public-cases";

export const GET = apiHandler<{ id: string }>(async ({ params }) => {
  return json(await getPublicCase(params.id), 200, { publicCache: true });
});
