import { FieldValue } from "firebase-admin/firestore";
import type { Profile } from "@/lib/types";
import { db, whereIn } from "@/lib/server/firebase";
import { body, getCourse, handler, HttpError, oneOf, requireRole } from "@/lib/server/http";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Assigns existing accounts to the course by email. */
export const POST = handler(async (req, { id }) => {
  await requireRole(req, "admin");
  await getCourse(id);
  const b = await body(req);
  const role = oneOf(b.role, ["student", "mentor"] as const, "Role");
  const raw = typeof b.emails === "string" ? b.emails : "";
  const emails = [...new Set(raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))].slice(0, 200);
  if (!emails.length) throw new HttpError(400, "Enter at least one email.");
  const invalid = emails.filter((e) => !EMAIL.test(e));
  const users = await whereIn<Profile>("users", "email", emails.filter((e) => EMAIL.test(e)));
  const found = new Map(users.map((u) => [u.email, u]));
  const added: string[] = [], wrongRole: string[] = [], notFound: string[] = [];
  const w = db().bulkWriter();
  for (const e of emails.filter((e) => EMAIL.test(e))) {
    const u = found.get(e);
    if (!u) notFound.push(e);
    else if (u.role !== role) wrongRole.push(e);
    else {
      added.push(e);
      if (role === "student") w.set(db().collection("enrollments").doc(`${id}_${u.id}`), { c: id, s: u.id, createdAt: Date.now() });
      else w.update(db().collection("courses").doc(id), { mentors: FieldValue.arrayUnion(u.id) });
    }
  }
  await w.close();
  return { added, notFound, wrongRole, invalid };
});
