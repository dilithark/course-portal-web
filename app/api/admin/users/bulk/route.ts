import type { BulkResult, Role } from "@/lib/types";
import { body, handler, HttpError, requireRole } from "@/lib/server/http";
import { courseIds, createAccount, EMAIL, existingAccounts, generatePassword, ROLES } from "@/lib/server/admin";

export const maxDuration = 300;
const MAX = 200;

/**
 * Creates many accounts with generated passwords, returned so the admin can share them privately.
 * Duplicates — within the batch or against existing accounts — are skipped, never overwritten.
 */
export const POST = handler(async (req): Promise<{ results: BulkResult[] }> => {
  await requireRole(req, "admin");
  const b = await body(req);
  const rows = Array.isArray(b.users) ? (b.users as Record<string, unknown>[]) : [];
  if (!rows.length) throw new HttpError(400, "Add at least one person.");
  if (rows.length > MAX) throw new HttpError(400, `Import at most ${MAX} people at a time.`);

  const clean = rows.map((r) => ({
    name: typeof r.name === "string" ? r.name.trim().slice(0, 120) : "",
    email: typeof r.email === "string" ? r.email.trim().toLowerCase().slice(0, 254) : "",
    role: (ROLES as readonly string[]).includes(r.role as string) ? (r.role as Role) : null,
    courses: courseIds(r.courses),
  }));
  const existing = await existingAccounts(clean.filter((r) => EMAIL.test(r.email)).map((r) => r.email));
  const seen = new Set<string>();
  const results: BulkResult[] = [];

  for (const r of clean) {
    const base = { email: r.email, name: r.name };
    if (!r.name || !EMAIL.test(r.email) || !r.role) {
      results.push({ ...base, status: "invalid", error: !r.name ? "Missing name" : !r.role ? "Unknown role" : "Invalid email" });
      continue;
    }
    if (seen.has(r.email)) {
      results.push({ ...base, status: "duplicate", error: "Listed more than once" });
      continue;
    }
    seen.add(r.email);
    const ex = existing.get(r.email);
    if (ex) {
      results.push({ ...base, status: "exists", error: ex.where === "portal" ? `Already ${ex.role === "admin" ? "an" : "a"} ${ex.role}${ex.name ? ` (${ex.name})` : ""}` : "Login exists without a portal profile" });
      continue;
    }
    const password = generatePassword();
    try {
      await createAccount({ name: r.name, email: r.email, role: r.role, password, courses: r.courses, mustChangePassword: true });
    } catch (e) {
      results.push({ ...base, status: "failed", error: (e as { code?: string }).code === "auth/email-already-exists" ? "Already has a login" : (e as Error).message });
      continue;
    }
    results.push({ ...base, status: "created", password });
  }
  return { results };
});
