"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMe } from "@/components/auth/AuthProvider";
import { useCourse } from "@/components/CourseContext";
import { CourseForm } from "@/components/CourseForm";
import { usePortal } from "@/components/shell/PortalContext";
import { ConfirmButton } from "@/components/ui/Confirm";
import { Icon } from "@/components/ui/Icon";
import { Avatar, Badge, Ext, Panel, RowLink, Stat } from "@/components/ui/bits";
import { api } from "@/lib/api";
import { useApi, useNow } from "@/lib/hooks";
import { dateTime, relative, timeRange } from "@/lib/time";
import type { Announcement, AssignmentRow, Session } from "@/lib/types";

export default function CourseOverview() {
  const me = useMe();
  const router = useRouter();
  const { course, reload } = useCourse();
  const { reloadCourses } = usePortal();
  const [editing, setEditing] = useState(false);
  const sessions = useApi<Session[]>(`/api/courses/${course.id}/sessions`);
  const assignments = useApi<AssignmentRow[]>(`/api/courses/${course.id}/assignments`);
  const anns = useApi<Announcement[]>(`/api/courses/${course.id}/announcements`);
  const now = useNow();
  const next = sessions.data?.filter((s) => s.endsAt >= now).slice(0, 3) ?? [];
  const due = assignments.data?.filter((a) => a.dueAt >= now && (course.canManage || !a.mine)).slice(0, 4) ?? [];

  return (
    <>
      {me.role === "admin" && (
        <div className="toolbar">
          <button className="btn ghost sm" onClick={() => setEditing(true)}>
            <Icon name="edit" size={16} /> Edit course
          </button>
          <ConfirmButton
            title={`Delete ${course.name}?`}
            message="This permanently deletes the course with all its sessions, resources, assignments, submissions, announcements and enrollments. It can’t be undone."
            confirmLabel="Delete course"
            onConfirm={async () => {
              await api(`/api/admin/courses/${course.id}`, "DELETE");
              await reloadCourses();
              router.replace("/courses");
            }}
          >
            <Icon name="trash" size={16} /> Delete
          </ConfirmButton>
        </div>
      )}
      <div className="stats">
        <Stat icon="calendar" label="Sessions" value={sessions.data?.length ?? "…"} />
        <Stat icon="clipboard" label="Assignments" value={assignments.data?.length ?? "…"} />
        <Stat icon="users" label="Students" value={course.students} />
        <Stat icon="megaphone" label="Announcements" value={anns.data?.length ?? "…"} />
      </div>
      <div className="grid-2">
        <Panel title="About this course">
          <p className="pw">{course.desc || "No description yet."}</p>
          <h3 className="sub-head">Mentors</h3>
          {course.mentorPeople.length ? (
            <ul className="people-mini">
              {course.mentorPeople.map((m) => (
                <li key={m.id}>
                  <Avatar name={m.name} size={32} />
                  <span>
                    <b>{m.name}</b>
                    <small className="mu">{m.email}</small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mu">No mentor assigned yet.</p>
          )}
        </Panel>
        <Panel title="Coming up" action={<Link className="link" href={`/courses/${course.id}/sessions`}>All sessions</Link>}>
          {next.length ? (
            <ul className="list">
              {next.map((s) => (
                <li key={s.id} className="list-row">
                  <div className="grow">
                    <b>{s.title}</b>
                    <p className="mu small">{timeRange(s.startsAt, s.endsAt)}</p>
                  </div>
                  {s.meeting && <Ext href={s.meeting.url} className="btn sm">Join</Ext>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mu">No upcoming sessions.</p>
          )}
        </Panel>
      </div>
      <div className="grid-2">
        <Panel title={course.canManage ? "Upcoming deadlines" : "Due soon"} action={<Link className="link" href={`/courses/${course.id}/assignments`}>All assignments</Link>}>
          {due.length ? (
            <ul className="list">
              {due.map((a) => (
                <li key={a.id}>
                  <RowLink href={`/courses/${course.id}/assignments/${a.id}`}>
                    <b>{a.title}</b>
                    <span className="mu small">Due {dateTime(a.dueAt)}</span>
                    {a.stats ? <Badge>{a.stats.submitted}/{a.stats.students} in</Badge> : <Badge tone="warn">{relative(a.dueAt)}</Badge>}
                  </RowLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mu">Nothing due.</p>
          )}
        </Panel>
        <Panel title="Recent announcements" action={<Link className="link" href={`/courses/${course.id}/announcements`}>View all</Link>}>
          {anns.data?.length ? (
            <ul className="list">
              {anns.data.slice(0, 3).map((a) => (
                <li key={a.id} className="list-row top">
                  <div className="grow">
                    <b>{a.title}</b>
                    <p className="mu small">{a.authorName} · {relative(a.at)}</p>
                    <p className="clamp small">{a.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mu">No announcements yet.</p>
          )}
        </Panel>
      </div>
      {me.role === "admin" && (
        <CourseForm
          open={editing}
          onClose={() => setEditing(false)}
          course={course}
          onSaved={() => {
            reload();
            reloadCourses();
          }}
        />
      )}
    </>
  );
}
