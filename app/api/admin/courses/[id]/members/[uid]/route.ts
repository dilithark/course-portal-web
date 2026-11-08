import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/server/firebase";
import { getCourse, handler, requireRole } from "@/lib/server/http";

export const DELETE = handler(async (req, { id, uid }) => {
  await requireRole(req, "admin");
  await getCourse(id);
  await Promise.all([
    db().collection("enrollments").doc(`${id}_${uid}`).delete(),
    db().collection("courses").doc(id).update({ mentors: FieldValue.arrayRemove(uid) }),
  ]);
});
