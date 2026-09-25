import { z } from "zod";
import { optText } from "@/lib/validation/common";
import { apiHandler, json, parseWith, readJson, uuidParam } from "@/server/http";
import { unpublishCase } from "@/server/services/admin-cases";

const schema = z.object({ note: optText(1000) });

export const POST = apiHandler<{ id: string }>(async ({ req, actor, params }) => {
  const { note } = parseWith(schema, await readJson(req));
  return json(await unpublishCase(actor, uuidParam(params.id, "Fall"), note));
});
