import type {
  Announcement, Assignment, AttendanceRecord, AttendanceStatus, Course, CourseSummary, Notification, PersonLite, Profile, Session, Submission,
} from "@/lib/types";
import { db, whereEq, whereIn } from "./firebase";

type Enrollment = { id: string; c: string; s: string; createdAt: number };

const byCreated = <T extends { createdAt?: number }>(a: T, b: T) => (a.createdAt ?? 0) - (b.createdAt ?? 0);

export async function allCourses(): Promise<Course[]> {
  const snap = await db().collection("courses").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Course).sort(byCreated);
}

/** Courses the user belongs to: all for admins, assigned for mentors, enrolled for students. */
export async function myCourses(me: Profile): Promise<Course[]> {
  if (me.role === "admin") return allCourses();
  if (me.role === "mentor") {
    const snap = await db().collection("courses").where("mentors", "array-contains", me.id).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Course).sort(byCreated);
  }
  const enr = await whereEq<Enrollment>("enrollments", "s", me.id);
  return (await whereIn<Course>("courses", "id", enr.map((e) => e.c))).sort(byCreated);
}

export async function people(ids: string[]): Promise<Map<string, Profile>> {
  const users = await whereIn<Profile>("users", "id", ids);
  return new Map(users.map((u) => [u.id, u]));
}

export const lite = (u: Profile, withEmail = false): PersonLite => ({ id: u.id, name: u.name, ...(withEmail ? { email: u.email } : {}) });

export const enrollmentsFor = (courseIds: string[]) => whereIn<Enrollment>("enrollments", "c", courseIds);

export async function studentsOf(courseId: string): Promise<Profile[]> {
  const enr = await whereEq<Enrollment>("enrollments", "c", courseId);
  const map = await people(enr.map((e) => e.s));
  return enr.map((e) => map.get(e.s)).filter((u): u is Profile => !!u && u.role === "student").sort((a, b) => a.name.localeCompare(b.name));
}

export const isAvailable = (x: { availableFrom: number | null }, now = Date.now()) => x.availableFrom == null || x.availableFrom <= now;

export async function summarize(courses: Course[], forStudent: boolean): Promise<CourseSummary[]> {
  const ids = courses.map((c) => c.id);
  const [enr, sessions, assignments, mentors] = await Promise.all([
    enrollmentsFor(ids),
    whereIn<Session>("sessions", "c", ids),
    whereIn<Assignment>("assignments", "c", ids),
    people(courses.flatMap((c) => c.mentors)),
  ]);
  const now = Date.now();
  return courses.map((c) => {
    const ss = sessions.filter((s) => s.c === c.id && (!forStudent || isAvailable(s, now)));
    const next = ss.filter((s) => s.endsAt >= now).sort((a, b) => a.startsAt - b.startsAt)[0];
    return {
      ...c,
      mentorNames: c.mentors.map((m) => mentors.get(m)?.name).filter((n): n is string => !!n),
      students: enr.filter((e) => e.c === c.id).length,
      sessions: ss.length,
      assignments: assignments.filter((a) => a.c === c.id && (!forStudent || isAvailable(a, now))).length,
      nextSession: next ? { id: next.id, title: next.title, startsAt: next.startsAt } : null,
    };
  });
}

export async function announcementsFor(courseIds: string[], includeSite = true): Promise<Announcement[]> {
  const [course, site, courses] = await Promise.all([
    whereIn<Announcement>("announcements", "c", courseIds),
    includeSite ? whereEq<Announcement>("announcements", "c", null) : Promise.resolve([]),
    whereIn<Course>("courses", "id", courseIds),
  ]);
  const names = new Map(courses.map((c) => [c.id, c.name]));
  return [...course, ...site].map((a) => ({ ...a, courseName: a.c ? names.get(a.c) : undefined })).sort((a, b) => b.at - a.at);
}

const DAY = 86_400_000;

/** Notifications are derived from activity in the user's courses rather than fanned out per user. */
export async function notificationsFor(me: Profile): Promise<Notification[]> {
  const courses = await myCourses(me);
  const ids = courses.map((c) => c.id);
  const names = new Map(courses.map((c) => [c.id, c.name]));
  const now = Date.now();
  const since = now - 30 * DAY;
  const seen = me.lastSeenNotificationsAt ?? 0;
  const out: Omit<Notification, "unread">[] = [];

  const anns = await announcementsFor(me.role === "admin" ? [] : ids);
  for (const a of anns) {
    if (a.at < since || a.author === me.id) continue;
    out.push({
      id: "ann-" + a.id,
      kind: a.c ? "announcement" : "site",
      title: a.c ? `${names.get(a.c) ?? "Course"}: ${a.title}` : `Academy: ${a.title}`,
      body: a.body.slice(0, 160),
      at: a.at,
      href: a.c ? `/courses/${a.c}/announcements` : "/announcements",
    });
  }

  if (me.role === "student") {
    const [asg, subs, sessions] = await Promise.all([
      whereIn<Assignment>("assignments", "c", ids),
      whereEq<Submission>("submissions", "s", me.id),
      whereIn<Session>("sessions", "c", ids),
    ]);
    for (const a of asg) {
      const at = Math.max(a.createdAt, a.availableFrom ?? 0);
      if (at < since || !isAvailable(a, now)) continue;
      out.push({ id: "asg-" + a.id, kind: "assignment", title: `New assignment: ${a.title}`, body: `${names.get(a.c)} · due ${new Date(a.dueAt).toUTCString().slice(0, 16)}`, at, href: `/courses/${a.c}/assignments/${a.id}` });
    }
    for (const s of subs) {
      if (s.gradedAt == null || s.gradedAt < since) continue;
      const a = asg.find((x) => x.id === s.g);
      out.push({ id: "grade-" + s.id, kind: "grade", title: `Graded: ${a?.title ?? "assignment"}`, body: `You got ${s.marks}/${a?.maxMarks ?? "?"}`, at: s.gradedAt, href: `/courses/${s.c}/assignments/${s.g}` });
    }
    for (const s of sessions) {
      if (!isAvailable(s, now) || s.startsAt < now || s.startsAt > now + DAY) continue;
      out.push({ id: "ses-" + s.id, kind: "session", title: `Starting soon: ${s.title}`, body: names.get(s.c) ?? "", at: Math.max(s.startsAt - DAY, s.createdAt), href: `/courses/${s.c}/sessions` });
    }
  }

  if (me.role === "mentor") {
    const [subs, asg] = await Promise.all([whereIn<Submission>("submissions", "c", ids), whereIn<Assignment>("assignments", "c", ids)]);
    const students = await people(subs.map((s) => s.s));
    for (const s of subs) {
      if (s.submittedAt < since) continue;
      const a = asg.find((x) => x.id === s.g);
      out.push({ id: "sub-" + s.id + s.submittedAt, kind: "submission", title: `${students.get(s.s)?.name ?? "A student"} submitted ${a?.title ?? "work"}`, body: names.get(s.c) ?? "", at: s.submittedAt, href: `/courses/${s.c}/assignments/${s.g}` });
    }
  }

  return out
    .filter((n) => n.at <= now)
    .sort((a, b) => b.at - a.at)
    .slice(0, 60)
    .map((n) => ({ ...n, unread: n.at > seen }));
}

/** Deterministic pseudo-random [0,1) from a string — keeps demo attendance stable across reloads. */
function hash01(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
}

/** DEMO DATA: attendance isn't tracked yet, so records are generated from session × student ids. */
export function demoAttendance(sessions: Session[], students: Profile[]): AttendanceRecord[] {
  const now = Date.now();
  return sessions
    .filter((s) => s.startsAt <= now)
    .flatMap((s) =>
      students.map((u) => {
        const r = hash01(s.id + u.id);
        const status: AttendanceStatus = r < 0.72 ? "present" : r < 0.86 ? "late" : "absent";
        const length = Math.max(15, Math.round((s.endsAt - s.startsAt) / 60_000));
        const lateBy = status === "late" ? 5 + Math.round(hash01(u.id + s.id) * 20) : Math.round(hash01(u.id) * 3);
        return {
          session: s.id,
          student: u.id,
          status,
          joinedAt: status === "absent" ? null : s.startsAt + lateBy * 60_000,
          minutes: status === "absent" ? 0 : Math.max(5, length - lateBy - Math.round(hash01(s.id + "x" + u.id) * 10)),
        };
      }),
    );
}
