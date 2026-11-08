import { db } from "@/lib/server/firebase";
import { handler, requireRole } from "@/lib/server/http";
import { INVITE_TOKEN } from "@/lib/server/admin";

/** Revokes a link. Accounts already created from it are untouched. */
export const DELETE = handler(async (req, { id }) => {
  await requireRole(req, "admin");
  if (INVITE_TOKEN.test(id)) await db().collection("invites").doc(id).delete();
});
