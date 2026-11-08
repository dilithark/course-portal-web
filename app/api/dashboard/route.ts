import type { Assignment, Profile, Session, Submission } from "@/lib/types";
import { db, whereEq, whereIn } from "@/lib/server/firebase";
import { currentUser, handler } from "@/lib/server/http";
import { announcementsFor, enrollmentsFor, isAvailable, myCourses, people, summarize } from "@/lib/server/queries";

const WEEK = 7 * 86_400_000;

export const GET = handler(async (req) => {
  const me = await currentUser(req);
  const courses = await myCourses(me);
  const ids = courses.map((c) => c.id);
  const names = new Map(courses.map((c) => [c.id, c.name]));
  const now = Date.now();
  const student = me.role === "student";

  const [summaries, sessions, assignments, anns] = await Promise.all([
    summarize(courses, student),
    whereIn<Session>("sessions", "c", ids),
    whereIn<Assignment>("assignments", "c", ids),
    announcementsFor(me.role === "admin" ? [] : ids),
  ]);
  const visibleSessions = sessions.filter((s) => !student || isAvailable(s, now));
  const upcoming = visibleSessions
    .filter((s) => s.endsAt >= now)
    .sort((a, b) => a.startsAt - b.startsAt)
    .slice(0, 6)
    .map((s) => ({ id: s.id, c: s.c, courseName: names.get(s.c), title: s.title, startsAt: s.startsAt, endsAt: s.endsAt, meeting: s.meeting }));
  const thisWeek = visibleSessions.filter((s) => s.startsAt >= now && s.startsAt <= now + WEEK).length;
  const base = { courses: summaries, upcoming, announcements: anns.slice(0, 5) };

  if (student) {
    const subs = await whereEq<Submission>("submissions", "s", me.id);
    const open = assignments.filter((a) => isAvailable(a, now));
    const done = new Set(subs.map((s) => s.g));
    const pending = open.filter((a) => !done.has(a.id));
    const graded = subs.filter((s) => s.marks != null && open.some((a) => a.id === s.g));
    const avg = graded.length
      ? Math.round((graded.reduce((t, s) => t + s.marks! / open.find((a) => a.id === s.g)!.maxMarks, 0) / graded.length) * 100)
      : null;
    return {
      ...base,
      stats: { courses: courses.length, thisWeek, pending: pending.filter((a) => a.dueAt >= now).length, overdue: pending.filter((a) => a.dueAt < now).length, average: avg },
      due: pending
        .sort((a, b) => a.dueAt - b.dueAt)
        .slice(0, 6)
        .map((a) => ({ id: a.id, c: a.c, courseName: names.get(a.c), title: a.title, dueAt: a.dueAt, allowLate: a.allowLate })),
      grades: graded
        .sort((a, b) => (b.gradedAt ?? 0) - (a.gradedAt ?? 0))
        .slice(0, 5)
        .map((s) => {
          const a = open.find((x) => x.id === s.g)!;
          return { id: s.id, c: s.c, g: s.g, title: a.title, courseName: names.get(s.c), marks: s.marks, maxMarks: a.maxMarks };
        }),
    };
  }

  if (me.role === "mentor") {
    const [subs, enr] = await Promise.all([whereIn<Submission>("submissions", "c", ids), enrollmentsFor(ids)]);
    const ungraded = subs.filter((s) => s.marks == null && assignments.some((a) => a.id === s.g));
    const who = await people(subs.slice(0, 200).map((s) => s.s));
    return {
      ...base,
      stats: { courses: courses.length, students: new Set(enr.map((e) => e.s)).size, thisWeek, ungraded: ungraded.length },
      toGrade: assignments
        .map((a) => ({ id: a.id, c: a.c, title: a.title, courseName: names.get(a.c), dueAt: a.dueAt, count: ungraded.filter((s) => s.g === a.id).length }))
        .filter((a) => a.count)
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
      recent: subs
        .sort((a, b) => b.submittedAt - a.submittedAt)
        .slice(0, 6)
        .map((s) => ({ id: s.id, c: s.c, g: s.g, student: who.get(s.s)?.name ?? "Student", title: assignments.find((a) => a.id === s.g)?.title ?? "", at: s.submittedAt, late: s.late })),
    };
  }

  const [users, subsCount] = await Promise.all([
    db().collection("users").get().then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }) as Profile)),
    db().collection("submissions").count().get().then((s) => s.data().count),
  ]);
  const count = (r: string) => users.filter((u) => u.role === r).length;
  return {
    ...base,
    stats: { students: count("student"), mentors: count("mentor"), admins: count("admin"), courses: courses.length, sessions: sessions.length, assignments: assignments.length, submissions: subsCount },
    recentUsers: users
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 6)
      .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt })),
  };
});
