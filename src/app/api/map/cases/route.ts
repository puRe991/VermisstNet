import { parseBBox } from "@/lib/geo";
import { caseFilterSchema } from "@/lib/validation/public";
import { apiHandler, json, parseWith, searchParamsObject } from "@/server/http";
import { getMapMarkers } from "@/server/services/public-cases";

export const GET = apiHandler(async ({ req }) => {
  const filter = parseWith(caseFilterSchema, searchParamsObject(req));
  const bbox = parseBBox(req.nextUrl.searchParams.get("bbox"));
  return json(await getMapMarkers(filter, bbox), 200, { publicCache: true });
});
