import { apiHandler, json } from "@/server/http";
import { validation } from "@/server/errors";
import { getPublicSources } from "@/server/services/public-cases";

export const GET = apiHandler(async ({ req }) => {
  const caseNumber = req.nextUrl.searchParams.get("case");
  if (!caseNumber) throw validation("Parameter 'case' (Fallnummer) fehlt");
  return json({ items: await getPublicSources(caseNumber) }, 200, { publicCache: true });
});
