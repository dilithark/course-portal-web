import type { Invite } from "@/lib/types";
import { db } from "@/lib/server/firebase";
import { docData, handler, HttpError } from "@/lib/server/http";
import { courseNames, INVITE_TOKEN } from "@/lib/server/admin";

/** Public: what the sign-up page shows for an invite link. */
export const GET = handler(async (_req, { id }) => {
  const snap = INVITE_TOKEN.test(id) ? await db().collection("invites").doc(id).get() : null;
  if (!snap?.exists) throw new HttpError(404, "This invite link isn’t valid. Ask your course admin for a new one.");
  const inv = docData<Invite>(snap);
  if (inv.usedAt) throw new HttpError(410, "This invite link has already been used. Sign in instead, or ask your course admin for a new link.");
  return { role: inv.role, label: inv.label, courses: await courseNames(inv.courses) };
});
