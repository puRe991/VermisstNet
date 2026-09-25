import { submissionSchema } from "@/lib/validation/public";
import { apiHandler, json, parseWith, readBody } from "@/server/http";
import { submitCaseSubmission } from "@/server/services/intake";
import { filesFromForm } from "@/server/services/uploads";

export const POST = apiHandler(async ({ req, actor }) => {
  const { fields, form } = await readBody(req);
  const input = parseWith(submissionSchema, fields);
  const [image] = form ? filesFromForm(form, "image") : [];
  return json(await submitCaseSubmission(actor, input, image ?? null), 201);
});
