import type { CourseDetail } from "@/lib/types";
import { courseAccess, handler } from "@/lib/server/http";
import { lite, people, studentsOf } from "@/lib/server/queries";

export const GET = handler(async (req, { id }): Promise<CourseDetail> => {
  const { course, canManage } = await courseAccess(req, id);
  const [mentors, students] = await Promise.all([people(course.mentors), studentsOf(id)]);
  return {
    ...course,
    mentorPeople: course.mentors.map((m) => mentors.get(m)).filter((u) => !!u).map((u) => lite(u, true)),
    canManage,
    students: students.length,
  };
});
