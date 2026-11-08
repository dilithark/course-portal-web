import type { Session } from "@/lib/types";
import { whereEq } from "@/lib/server/firebase";
import { courseAccess, handler } from "@/lib/server/http";
import { demoAttendance, lite, studentsOf } from "@/lib/server/queries";

/** DEMO: attendance isn't captured yet; records are generated deterministically. */
export const GET = handler(async (req, { id }) => {
  await courseAccess(req, id, "manage");
  const [sessions, students] = await Promise.all([whereEq<Session>("sessions", "c", id), studentsOf(id)]);
  sessions.sort((a, b) => a.startsAt - b.startsAt);
  return {
    demo: true,
    sessions: sessions.map(({ id, title, startsAt, endsAt }) => ({ id, title, startsAt, endsAt })),
    students: students.map((u) => lite(u, true)),
    records: demoAttendance(sessions, students),
  };
});
