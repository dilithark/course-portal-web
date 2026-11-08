import type { Invite } from "@/lib/types";
import { db } from "@/lib/server/firebase";
import { body, docData, handler, HttpError, requireRole, str } from "@/lib/server/http";
import { courseIds, newInviteToken } from "@/lib/server/admin";

export const GET = handler(async (req) => {
  await requireRole(req, "admin");
  const snap = await db().collection("invites").orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => docData<Invite>(d));
});

/** Creates a single-use mentor sign-up link for the chosen courses. */
export const POST = handler(async (req) => {
  const me = await requireRole(req, "admin");
  const b = await body(req);
  const label = str(b.label, 120);
  const wanted = courseIds(b.courses);
  const snaps = wanted.length ? await db().getAll(...wanted.map((id) => db().collection("courses").doc(id))) : [];
  const courses = snaps.filter((s) => s.exists).map((s) => s.id);
  if (!courses.length) throw new HttpError(400, "Pick at least one course for this mentor.");

  const id = newInviteToken();
  const invite: Omit<Invite, "id"> = { role: "mentor", courses, label, createdAt: Date.now(), createdBy: me.id, usedAt: null, usedBy: null, usedByName: null };
  await db().collection("invites").doc(id).set(invite);
  return { id, ...invite } satisfies Invite;
});
