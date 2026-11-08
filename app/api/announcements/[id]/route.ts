import type { Announcement } from "@/lib/types";
import { db } from "@/lib/server/firebase";
import { courseAccess, handler, HttpError, requireRole } from "@/lib/server/http";

export const DELETE = handler(async (req, { id }) => {
  const ref = db().collection("announcements").doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, "That announcement no longer exists.");
  const a = snap.data() as Announcement;
  if (a.c) await courseAccess(req, a.c, "manage");
  else await requireRole(req, "admin");
  await ref.delete();
});
