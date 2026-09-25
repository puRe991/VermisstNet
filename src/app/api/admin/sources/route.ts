import { z } from "zod";
import { pagination } from "@/lib/validation/common";
import { apiHandler, json, parseWith, searchParamsObject } from "@/server/http";
import { listSourcesAdmin } from "@/server/services/admin-sources";

const schema = pagination.extend({
  verified: z.enum(["true", "false"]).optional().transform((v) => (v === undefined ? undefined : v === "true")),
});

export const GET = apiHandler(async ({ req, actor }) => {
  return json(await listSourcesAdmin(actor, parseWith(schema, searchParamsObject(req))));
});
