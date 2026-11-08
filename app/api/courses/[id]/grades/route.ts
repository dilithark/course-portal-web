import type { Assignment, Submission } from "@/lib/types";
import { whereEq } from "@/lib/server/firebase";
import { courseAccess, handler } from "@/lib/server/http";
import { isAvailable, lite, studentsOf } from "@/lib/server/queries";

export const GET = handler(async (req, { id }) => {
  const { me, canManage } = await courseAccess(req, id);
  const assignments = (await whereEq<Assignment>("assignments", "c", id)).filter((a) => canManage || isAvailable(a)).sort((a, b) => a.dueAt - b.dueAt);
  if (!canManage) {
    const subs = (await whereEq<Submission>("submissions", "s", me.id)).filter((s) => s.c === id);
    return { assignments, students: [lite(me)], submissions: subs };
  }
  const [students, submissions] = await Promise.all([studentsOf(id), whereEq<Submission>("submissions", "c", id)]);
  return { assignments, students: students.map((u) => lite(u, true)), submissions };
});
