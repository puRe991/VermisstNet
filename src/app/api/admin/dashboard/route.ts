import { apiHandler, json } from "@/server/http";
import { getDashboard } from "@/server/services/dashboard";

export const GET = apiHandler(async ({ actor }) => json(await getDashboard(actor)));
