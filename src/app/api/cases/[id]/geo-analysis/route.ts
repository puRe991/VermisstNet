import { apiHandler, json } from "@/server/http";
import { getGeoAnalysis } from "@/server/services/public-cases";

export const GET = apiHandler<{ id: string }>(async ({ params }) => {
  return json(await getGeoAnalysis(params.id), 200, { publicCache: true });
});
