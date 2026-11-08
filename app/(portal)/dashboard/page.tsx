"use client";

import Link from "next/link";
import { useMe } from "@/components/auth/AuthProvider";
import { CourseCard } from "@/components/CourseCard";
import { Icon } from "@/components/ui/Icon";
import { Async, Badge, Empty, Ext, PageHeader, Panel, RowLink, Stat } from "@/components/ui/bits";
import { useApi, useNow } from "@/lib/hooks";
import { dateTime, relative, timeRange } from "@/lib/time";
import type { Announcement, CourseSummary, Meeting, Role } from "@/lib/types";

type Upcoming = { id: string; c: string; courseName?: string; title: string; startsAt: number; endsAt: number; meeting: Meeting };
type Base = { courses: CourseSummary[]; upcoming: Upcoming[]; announcements: Announcement[] };
type StudentDash = Base & {
  stats: { courses: number; thisWeek: number; pending: number; overdue: number; average: number | null };
  due: { id: string; c: string; courseName?: string; title: string; dueAt: number; allowLate: boolean }[];
  grades: { id: string; c: string; g: string; title: string; courseName?: string; marks: number; maxMarks: number }[];
};
type MentorDash = Base & {
  stats: { courses: number; students: number; thisWeek: number; ungraded: number };
  toGrade: { id: string; c: string; title: string; courseName?: string; dueAt: number; count: number }[];
  recent: { id: string; c: string; g: string; student: string; title: string; at: number; late: boolean }[];
};
type AdminDash = Base & {
  stats: { students: number; mentors: number; admins: number; courses: number; sessions: number; assignments: number; submissions: number };
  recentUsers: { id: string; name: string; email: string; role: Role; createdAt: number }[];
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

function UpcomingPanel({ items }: { items: Upcoming[] }) {
  const now = useNow();
  return (
    <Panel title="Upcoming sessions" action={<Icon name="calendar" />}>
      {items.length ? (
        <ul className="list">
          {items.map((s) => {
            const live = s.startsAt <= now && s.endsAt >= now;
            return (
              <li key={s.id} className="list-row">
                <div className="date-chip">
                  <b>{new Date(s.startsAt).getDate()}</b>
                  <small>{new Date(s.startsAt).toLocaleString([], { month: "short" })}</small>
                </div>
                <div className="grow">
                  <Link href={`/courses/${s.c}/sessions#${s.id}`} className="strong-link">{s.title}</Link>
                  <p className="mu small">{s.courseName} · {timeRange(s.startsAt, s.endsAt)}</p>
                </div>
                {live && <Badge tone="er">Live now</Badge>}
                {s.meeting && (
                  <Ext href={s.meeting.url} className="btn sm">
                    Join
                  </Ext>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mu">No upcoming sessions scheduled.</p>
      )}
    </Panel>
  );
}

function AnnouncementsPanel({ items }: { items: Announcement[] }) {
  return (
    <Panel title="Latest announcements" action={<Link href="/announcements" className="link">View all</Link>}>
      {items.length ? (
        <ul className="list">
          {items.map((a) => (
            <li key={a.id} className="list-row top">
              <span className={`ann-dot ${a.c ? "" : "site"}`}><Icon name={a.c ? "megaphone" : "globe"} size={16} /></span>
              <div className="grow">
                <b>{a.title}</b>
                <p className="mu small">{a.courseName ?? "Academy-wide"} · {relative(a.at)}</p>
                <p className="clamp small">{a.body}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mu">No announcements yet.</p>
      )}
    </Panel>
  );
}

function Courses({ courses, role }: { courses: CourseSummary[]; role: Role }) {
  return (
    <Panel title={role === "admin" ? "Courses" : "Your courses"} action={<Link href="/courses" className="link">View all</Link>}>
      {courses.length ? (
        <div className="course-grid">{courses.map((c) => <CourseCard key={c.id} c={c} />)}</div>
      ) : (
        <Empty title="No courses yet">{role === "student" ? "Your admin will add you to your courses." : "An admin will assign you to a course."}</Empty>
      )}
    </Panel>
  );
}

function Student({ d }: { d: StudentDash }) {
  const now = useNow();
  return (
    <>
      <div className="stats">
        <Stat icon="book" label="Enrolled courses" value={d.stats.courses} />
        <Stat icon="calendar" label="Sessions this week" value={d.stats.thisWeek} />
        <Stat icon="clipboard" label="Assignments due" value={d.stats.pending} hint={d.stats.overdue ? `${d.stats.overdue} overdue` : "Nothing overdue"} tone={d.stats.overdue ? "warn" : undefined} />
        <Stat icon="award" label="Average grade" value={d.stats.average == null ? "—" : `${d.stats.average}%`} tone="ok" />
      </div>
      <div className="grid-2">
        <UpcomingPanel items={d.upcoming} />
        <Panel title="To do" action={<Icon name="clipboard" />}>
          {d.due.length ? (
            <ul className="list">
              {d.due.map((a) => {
                const overdue = a.dueAt < now;
                return (
                  <li key={a.id}>
                    <RowLink href={`/courses/${a.c}/assignments/${a.id}`}>
                      <b>{a.title}</b>
                      <span className="mu small">{a.courseName} · due {dateTime(a.dueAt)}</span>
                      {overdue ? <Badge tone="er">{a.allowLate ? "Overdue · late allowed" : "Missed"}</Badge> : <Badge tone="warn">{relative(a.dueAt)}</Badge>}
                    </RowLink>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mu">You’re all caught up. 🎉</p>
          )}
        </Panel>
      </div>
      <Courses courses={d.courses} role="student" />
      <div className="grid-2">
        <Panel title="Recent grades" action={<Icon name="award" />}>
          {d.grades.length ? (
            <ul className="list">
              {d.grades.map((g) => (
                <li key={g.id}>
                  <RowLink href={`/courses/${g.c}/assignments/${g.g}`}>
                    <b>{g.title}</b>
                    <span className="mu small">{g.courseName}</span>
                    <Badge tone="ok">{g.marks}/{g.maxMarks}</Badge>
                  </RowLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mu">No grades yet.</p>
          )}
        </Panel>
        <AnnouncementsPanel items={d.announcements} />
      </div>
    </>
  );
}

function Mentor({ d }: { d: MentorDash }) {
  return (
    <>
      <div className="stats">
        <Stat icon="book" label="Your courses" value={d.stats.courses} />
        <Stat icon="users" label="Students" value={d.stats.students} />
        <Stat icon="calendar" label="Sessions this week" value={d.stats.thisWeek} />
        <Stat icon="clipboard" label="Waiting to grade" value={d.stats.ungraded} tone={d.stats.ungraded ? "warn" : "ok"} />
      </div>
      <div className="grid-2">
        <UpcomingPanel items={d.upcoming} />
        <Panel title="Needs grading" action={<Icon name="award" />}>
          {d.toGrade.length ? (
            <ul className="list">
              {d.toGrade.map((a) => (
                <li key={a.id}>
                  <RowLink href={`/courses/${a.c}/assignments/${a.id}`}>
                    <b>{a.title}</b>
                    <span className="mu small">{a.courseName}</span>
                    <Badge tone="warn">{a.count} to grade</Badge>
                  </RowLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mu">Nothing waiting for marks.</p>
          )}
        </Panel>
      </div>
      <Courses courses={d.courses} role="mentor" />
      <div className="grid-2">
        <Panel title="Recent submissions" action={<Icon name="file" />}>
          {d.recent.length ? (
            <ul className="list">
              {d.recent.map((s) => (
                <li key={s.id}>
                  <RowLink href={`/courses/${s.c}/assignments/${s.g}`}>
                    <b>{s.student}</b>
                    <span className="mu small">{s.title} · {relative(s.at)}</span>
                    {s.late && <Badge tone="warn">Late</Badge>}
                  </RowLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mu">No submissions yet.</p>
          )}
        </Panel>
        <AnnouncementsPanel items={d.announcements} />
      </div>
    </>
  );
}

function Admin({ d }: { d: AdminDash }) {
  return (
    <>
      <div className="stats">
        <Stat icon="users" label="Students" value={d.stats.students} />
        <Stat icon="user" label="Mentors" value={d.stats.mentors} hint={`${d.stats.admins} admin${d.stats.admins === 1 ? "" : "s"}`} />
        <Stat icon="book" label="Courses" value={d.stats.courses} hint={`${d.stats.sessions} sessions`} />
        <Stat icon="clipboard" label="Submissions" value={d.stats.submissions} hint={`${d.stats.assignments} assignments`} tone="ok" />
      </div>
      <Courses courses={d.courses} role="admin" />
      <div className="grid-2">
        <Panel title="Newest accounts" action={<Link href="/admin/users" className="link">Manage users</Link>}>
          <ul className="list">
            {d.recentUsers.map((u) => (
              <li key={u.id} className="list-row">
                <div className="grow">
                  <b>{u.name}</b>
                  <p className="mu small">{u.email}</p>
                </div>
                <Badge tone={u.role === "admin" ? "br" : u.role === "mentor" ? "info" : "mu"}>{u.role}</Badge>
              </li>
            ))}
          </ul>
        </Panel>
        <AnnouncementsPanel items={d.announcements} />
      </div>
      <UpcomingPanel items={d.upcoming} />
    </>
  );
}

export default function DashboardPage() {
  const me = useMe();
  const q = useApi<StudentDash & MentorDash & AdminDash>("/api/dashboard");
  return (
    <>
      <PageHeader eyebrow={greeting()} title={me.name.split(" ")[0]} sub={me.role === "admin" ? "Here’s how the academy is doing." : "Here’s what’s happening in your courses."} />
      <Async q={q}>{(d) => (me.role === "student" ? <Student d={d} /> : me.role === "mentor" ? <Mentor d={d} /> : <Admin d={d} />)}</Async>
    </>
  );
}
