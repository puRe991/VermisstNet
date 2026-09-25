import { apiHandler, json } from "@/server/http";

export const GET = apiHandler(async ({ actor }) => {
  const u = actor.user;
  return json({ user: u ? { id: u.id, email: u.email, displayName: u.displayName, role: u.role } : null });
});
