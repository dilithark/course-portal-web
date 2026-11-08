import Link from "next/link";
import type { CSSProperties } from "react";
import { dateTime } from "@/lib/time";
import type { CourseSummary } from "@/lib/types";
import { Icon } from "./ui/Icon";

export function CourseCard({ c }: { c: CourseSummary }) {
  return (
    <Link href={`/courses/${c.id}`} className="course-card" style={{ "--h": c.hue } as CSSProperties}>
      <div className="course-banner">
        <span className="course-code">{c.code}</span>
      </div>
      <div className="course-body">
        <h3>{c.name}</h3>
        <p className="mu clamp">{c.desc || "No description yet."}</p>
        <p className="course-mentors">
          <Icon name="user" size={14} />
          {c.mentorNames.length ? c.mentorNames.join(", ") : "Mentor to be assigned"}
        </p>
        <div className="course-meta">
          <span><Icon name="calendar" size={14} />{c.sessions} sessions</span>
          <span><Icon name="clipboard" size={14} />{c.assignments} assignments</span>
          <span><Icon name="users" size={14} />{c.students} students</span>
        </div>
        {c.nextSession && (
          <p className="course-next">
            Next: <b>{c.nextSession.title}</b> · {dateTime(c.nextSession.startsAt)}
          </p>
        )}
      </div>
    </Link>
  );
}
