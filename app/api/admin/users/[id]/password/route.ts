import { adminAuth, db } from "@/lib/server/firebase";
import { body, handler, requireRole } from "@/lib/server/http";
import { password } from "@/lib/server/admin";

export const PUT = handler(async (req, { id }) => {
  await requireRole(req, "admin");
  await adminAuth().updateUser(id, { password: password((await body(req)).password) });
  await adminAuth().revokeRefreshTokens(id);
  await db().collection("users").doc(id).update({ mustChangePassword: true });
});
