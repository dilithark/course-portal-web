import type { Profile } from "@/lib/types";
import { adminAuth, db, deleteWhere } from "@/lib/server/firebase";
import { body, handler, HttpError, oneOf, requireRole, str } from "@/lib/server/http";
import { courseIds, ROLES, setMemberships } from "@/lib/server/admin";

export const PATCH = handler(async (req, { id }) => {
  const me = await requireRole(req, "admin");
  const ref = db().collection("users").doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, "That user no longer exists.");
  const user = snap.data() as Profile;
  const b = await body(req);
  const role = oneOf(b.role ?? user.role, ROLES, "Role");
  const disabled = b.disabled === true;
  if (id === me.id && (role !== "admin" || disabled)) throw new HttpError(400, "You can’t remove your own admin access or suspend yourself.");
  const name = str(b.name ?? user.name, 120, "Name");
  await ref.update({ name, role, disabled });
  await adminAuth().updateUser(id, { displayName: name, disabled });
  if (disabled && !user.disabled) await adminAuth().revokeRefreshTokens(id);
  if (Array.isArray(b.courses) || role !== user.role) await setMemberships(id, role, courseIds(b.courses));
});

/** Removes the account and everything that belongs to it. */
export const DELETE = handler(async (req, { id }) => {
  const me = await requireRole(req, "admin");
  if (id === me.id) throw new HttpError(400, "You can’t delete your own account.");
  await setMemberships(id, "admin", []);
  await Promise.all([deleteWhere("submissions", "s", id)]);
  await adminAuth().deleteUser(id).catch((e) => {
    if (e.code !== "auth/user-not-found") throw e;
  });
  await db().collection("users").doc(id).delete();
});
