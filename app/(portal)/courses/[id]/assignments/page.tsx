"use client";

import Link from "next/link";
import { useState } from "react";
import { AssignmentForm } from "@/components/AssignmentForm";
import { useCourse } from "@/components/CourseContext";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Async, Badge, Empty, Progress } from "@/components/ui/bits";
import { useApi, useNow } from "@/lib/hooks";
import { dateTime, relative } from "@/lib/time";
import type { AssignmentRow } from "@/lib/types";

function studentState(a: AssignmentRow, now: number) {
  if (a.mine?.marks != null) return { label: `Graded ${a.mine.marks}/${a.maxMarks}`, tone: "ok" as const };
  if (a.mine) return { label: a.mine.late ? "Submitted late" : "Submitted", tone: "info" as const };
  if (a.dueAt < now) return { label: a.allowLate ? "Overdue" : "Missed", tone: "er" as const };
  return { label: `Due ${relative(a.dueAt)}`, tone: "warn" as const };
}

export default function AssignmentsPage() {
  const { course } = useCourse();
  const q = useApi<AssignmentRow[]>(`/api/courses/${course.id}/assignments`);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const now = useNow();

  return (
    <>
      <div className="section-head">
        <div className="seg">
          {(["all", "open", "closed"] as const).map((f) => (
            <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        {course.canManage && (
          <button className="btn" onClick={() => setCreating(true)}>
            <Icon name="plus" /> New assignment
          </button>
        )}
      </div>
      <Async q={q}>
        {(rows) => {
          const list = rows.filter((a) => filter === "all" || (filter === "open" ? a.dueAt >= now : a.dueAt < now));
          if (!list.length)
            return (
              <Empty icon="clipboard" title={rows.length ? "No assignments match" : "No assignments yet"}>
                {course.canManage ? "Publish an assignment with a deadline and marks." : "Assignments from your mentor will appear here."}
              </Empty>
            );
          return (
            <div className="table-wrap panel">
              <table className="table">
                <thead>
                  <tr>
                    <th>Assignment</th>
                    <th>Deadline</th>
                    <th>Marks</th>
                    <th>{course.canManage ? "Submissions" : "Status"}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((a) => {
                    const st = !course.canManage && studentState(a, now);
                    return (
                      <tr key={a.id}>
                        <td>
                          <Link href={`/courses/${course.id}/assignments/${a.id}`} className="strong-link">{a.title}</Link>
                          {a.availableFrom && a.availableFrom > now && <p className="mu small">Hidden until {dateTime(a.availableFrom)}</p>}
                        </td>
                        <td>
                          {dateTime(a.dueAt)}
                          <p className="mu small">{relative(a.dueAt)}{a.allowLate ? " · late OK" : ""}</p>
                        </td>
                        <td>{a.maxMarks}</td>
                        <td>
                          {a.stats ? (
                            <div className="sub-stat">
                              <span>{a.stats.submitted}/{a.stats.students} submitted · {a.stats.graded} graded</span>
                              <Progress value={a.stats.submitted} max={a.stats.students} />
                            </div>
                          ) : (
                            st && <Badge tone={st.tone}>{st.label}</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }}
      </Async>
      <Modal open={creating} onClose={() => setCreating(false)} title="New assignment" wide>
        {creating && <AssignmentForm courseId={course.id} onClose={() => setCreating(false)} onSaved={q.reload} />}
      </Modal>
    </>
  );
}
