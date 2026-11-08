"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { CourseCtx } from "@/components/CourseContext";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Async } from "@/components/ui/bits";
import { useApi } from "@/lib/hooks";
import type { CourseDetail } from "@/lib/types";

export default function CourseLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const path = usePathname();
  const q = useApi<CourseDetail>(`/api/courses/${id}`);

  return (
    <Async q={q}>
      {(course) => {
        const base = `/courses/${id}`;
        const tabs: [string, string, IconName][] = [
          ["", "Overview", "dashboard"],
          ["/sessions", "Sessions", "calendar"],
          ["/assignments", "Assignments", "clipboard"],
          ["/announcements", "Announcements", "megaphone"],
          ["/grades", course.canManage ? "Gradebook" : "Grades", "award"],
          ["/people", "People", "users"],
          ...(course.canManage ? ([["/attendance", "Attendance", "check"]] as [string, string, IconName][]) : []),
        ];
        return (
          <CourseCtx.Provider value={{ course, reload: q.reload }}>
            <div className="course-hero" style={{ "--h": course.hue } as CSSProperties}>
              <Link href="/courses" className="crumb">
                <Icon name="book" size={14} /> Courses
              </Link>
              <p className="course-code">{course.code}</p>
              <h1>{course.name}</h1>
              <p className="hero-meta">
                {course.mentorPeople.length ? `Mentored by ${course.mentorPeople.map((m) => m.name).join(" & ")}` : "Mentor to be assigned"} · {course.students} student{course.students === 1 ? "" : "s"}
              </p>
            </div>
            <nav className="course-tabs" aria-label="Course sections">
              {tabs.map(([href, label, icon]) => {
                const full = base + href;
                const on = href ? path.startsWith(full) : path === base;
                return (
                  <Link key={href} href={full} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>
                    <Icon name={icon} size={16} />
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="course-content">{children}</div>
          </CourseCtx.Provider>
        );
      }}
    </Async>
  );
}
