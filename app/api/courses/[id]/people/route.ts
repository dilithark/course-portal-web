import type { Assignment, Submission } from "@/lib/types";
import { whereEq } from "@/lib/server/firebase";
import { courseAccess, handler } from "@/lib/server/http";
import { lite, people, studentsOf } from "@/lib/server/queries";

export const GET = handler(async (req, { id }) => {
  const { course, canManage } = await courseAccess(req, id);
  const mentors = await people(course.mentors);
  const mentorList = course.mentors.map((m) => mentors.get(m)).filter((u) => !!u).map((u) => lite(u, true));
  if (!canManage) return { mentors: mentorList, students: [] };

  const [students, asg, subs, enr] = await Promise.all([
    studentsOf(id),
    whereEq<Assignment>("assignments", "c", id),
    whereEq<Submission>("submissions", "c", id),
    whereEq<{ s: string; createdAt: number }>("enrollments", "c", id),
  ]);
  const max = new Map(asg.map((a) => [a.id, a.maxMarks]));
  return {
    mentors: mentorList,
    students: students.map((u) => {
      const mine = subs.filter((s) => s.s === u.id && max.has(s.g));
      const graded = mine.filter((s) => s.marks != null);
      const pct = graded.length ? Math.round((graded.reduce((t, s) => t + s.marks! / max.get(s.g)!, 0) / graded.length) * 100) : null;
      return { ...lite(u, true), phone: u.phone ?? "", enrolledAt: enr.find((e) => e.s === u.id)?.createdAt ?? null, submitted: mine.length, assignments: asg.length, average: pct };
    }),
  };
});
