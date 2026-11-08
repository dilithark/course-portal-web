import type { Assignment, Session, Submission } from "@/lib/types";
import { db, deleteWhere, whereEq } from "@/lib/server/firebase";
import { body, handler, HttpError, ownedDoc } from "@/lib/server/http";
import { assignmentInput } from "@/lib/server/inputs";
import { isAvailable, lite, studentsOf } from "@/lib/server/queries";

export const GET = handler(async (req, { id }) => {
  const { item, me, canManage } = await ownedDoc<Assignment>(req, "assignments", id, "view");
  if (!canManage && !isAvailable(item)) throw new HttpError(404, "That assignment isn’t available yet.");
  const session = item.session ? (await db().collection("sessions").doc(item.session).get()).data() as Session | undefined : undefined;
  const base = { ...item, sessionTitle: session?.title ?? null, canManage };
  if (!canManage) {
    const mine = await db().collection("submissions").doc(`${id}_${me.id}`).get();
    return { ...base, mine: mine.exists ? ({ id: mine.id, ...mine.data() } as Submission) : null };
  }
  const [students, subs] = await Promise.all([studentsOf(item.c), whereEq<Submission>("submissions", "g", id)]);
  return { ...base, rows: students.map((u) => ({ student: lite(u, true), submission: subs.find((s) => s.s === u.id) ?? null })) };
});

export const PATCH = handler(async (req, { id }) => {
  const { ref, item } = await ownedDoc<Assignment>(req, "assignments", id);
  await ref.update(await assignmentInput(await body(req), item.c));
});

export const DELETE = handler(async (req, { id }) => {
  const { ref } = await ownedDoc<Assignment>(req, "assignments", id);
  await deleteWhere("submissions", "g", id);
  await ref.delete();
});
