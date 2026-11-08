import { body, handler, HttpError, requireRole } from "@/lib/server/http";
import { existingAccounts } from "@/lib/server/admin";

/** Duplicate check: which of these emails already have an account. */
export const POST = handler(async (req) => {
  await requireRole(req, "admin");
  const raw = (await body(req)).emails;
  const emails = Array.isArray(raw) ? raw.filter((e): e is string => typeof e === "string").map((e) => e.trim().toLowerCase()).filter(Boolean) : [];
  if (emails.length > 500) throw new HttpError(400, "Check at most 500 emails at a time.");
  return { existing: [...(await existingAccounts(emails)).values()] };
});
