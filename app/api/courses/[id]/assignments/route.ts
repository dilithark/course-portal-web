import type { Assignment, AssignmentRow, Submission } from "@/lib/types";
import { db, whereEq } from "@/lib/server/firebase";
import { body, courseAccess, handler } from "@/lib/server/http";
import { assignmentInput } from "@/lib/server/inputs";
import { isAvailable, studentsOf } from "@/lib/server/queries";

export const GET = handler(async (req, { id }): Promise<AssignmentRow[]> => {
  const { me, canManage } = await courseAccess(req, id);
  const assignments = (await whereEq<Assignment>("assignments", "c", id)).sort((a, b) => a.dueAt - b.dueAt);
  if (!canManage) {
    const mine = await whereEq<Submission>("submissions", "s", me.id);
    return assignments.filter((a) => isAvailable(a)).map((a) => ({ ...a, mine: mine.find((s) => s.g === a.id) ?? null }));
  }
  const [subs, students] = await Promise.all([whereEq<Submission>("submissions", "c", id), studentsOf(id)]);
  const enrolled = new Set(students.map((s) => s.id));
  return assignments.map((a) => {
    const ss = subs.filter((s) => s.g === a.id && enrolled.has(s.s));
    return { ...a, stats: { students: enrolled.size, submitted: ss.length, graded: ss.filter((s) => s.marks != null).length } };
  });
});

export const POST = handler(async (req, { id }) => {
  await courseAccess(req, id, "manage");
  const ref = await db().collection("assignments").add({ c: id, ...(await assignmentInput(await body(req), id)), createdAt: Date.now() });
  return { id: ref.id };
});
