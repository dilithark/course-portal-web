import { db, deleteWhere } from "@/lib/server/firebase";
import { body, getCourse, handler, requireRole } from "@/lib/server/http";
import { courseFields } from "@/lib/server/admin";

export const PATCH = handler(async (req, { id }) => {
  await requireRole(req, "admin");
  await getCourse(id);
  await db().collection("courses").doc(id).update(courseFields(await body(req)));
});

/** Cascades to everything that belongs to the course. */
export const DELETE = handler(async (req, { id }) => {
  await requireRole(req, "admin");
  await Promise.all(["enrollments", "sessions", "resources", "assignments", "submissions", "announcements"].map((k) => deleteWhere(k, "c", id)));
  await db().collection("courses").doc(id).delete();
});
