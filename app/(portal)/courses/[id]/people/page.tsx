"use client";

import { useState } from "react";
import { useMe } from "@/components/auth/AuthProvider";
import { useCourse } from "@/components/CourseContext";
import { usePortal } from "@/components/shell/PortalContext";
import { ConfirmButton } from "@/components/ui/Confirm";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Async, Avatar, Badge, Empty, ErrorText, Panel } from "@/components/ui/bits";
import { api } from "@/lib/api";
import { formObject, useAction, useApi } from "@/lib/hooks";
import { date } from "@/lib/time";
import type { PersonLite } from "@/lib/types";

type Student = PersonLite & { phone: string; enrolledAt: number | null; submitted: number; assignments: number; average: number | null };
type People = { mentors: PersonLite[]; students: Student[] };
type AssignResult = { added: string[]; notFound: string[]; wrongRole: string[]; invalid: string[] };

function AssignForm({ courseId, onDone }: { courseId: string; onDone: () => void }) {
  const { run, pending, error } = useAction();
  const [result, setResult] = useState<AssignResult | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await run(() => api<AssignResult>(`/api/admin/courses/${courseId}/members`, "POST", formObject(e.currentTarget)));
        if (r) {
          setResult(r);
          onDone();
        }
      }}
    >
      <div className="modal-body form-grid">
        <label className="field">
          <span>Assign as</span>
          <select name="role" defaultValue="student">
            <option value="student">Students</option>
            <option value="mentor">Mentors</option>
          </select>
        </label>
        <label className="field span-2">
          <span>Emails</span>
          <textarea name="emails" rows={5} required placeholder={"one@example.com\ntwo@example.com"} />
          <small className="mu">Separate with commas or new lines. Accounts must already exist — create them under Users.</small>
        </label>
        <ErrorText err={error} />
        {result && (
          <div className="span-2 result">
            {!!result.added.length && <p className="okt">Added {result.added.length}: {result.added.join(", ")}</p>}
            {!!result.notFound.length && <p className="er">No account: {result.notFound.join(", ")}</p>}
            {!!result.wrongRole.length && <p className="er">Different role: {result.wrongRole.join(", ")}</p>}
            {!!result.invalid.length && <p className="er">Not valid emails: {result.invalid.join(", ")}</p>}
          </div>
        )}
      </div>
      <footer className="modal-foot">
        <button className="btn" disabled={pending}>{pending ? "Assigning…" : "Assign to course"}</button>
      </footer>
    </form>
  );
}

export default function PeoplePage() {
  const me = useMe();
  const { course, reload } = useCourse();
  const { reloadCourses } = usePortal();
  const q = useApi<People>(`/api/courses/${course.id}/people`);
  const [assigning, setAssigning] = useState(false);
  const [search, setSearch] = useState("");
  const toast = useToast();
  const admin = me.role === "admin";
  const refresh = () => {
    q.reload();
    reload();
    reloadCourses();
  };
  const remove = (u: PersonLite, role: string) => (
    <ConfirmButton
      className="icon-btn"
      ariaLabel={`Remove ${u.name}`}
      title={`Remove ${u.name}?`}
      message={`They’ll lose access to ${course.name} as a ${role}. Their account stays active.`}
      onConfirm={async () => {
        await api(`/api/admin/courses/${course.id}/members/${u.id}`, "DELETE");
        toast(`${u.name} removed from the course`);
        refresh();
      }}
    >
      <Icon name="trash" size={16} />
    </ConfirmButton>
  );

  return (
    <Async q={q}>
      {(p) => {
        const students = p.students.filter((s) => (s.name + s.email).toLowerCase().includes(search.toLowerCase()));
        return (
          <>
            {admin && (
              <div className="toolbar">
                <button className="btn" onClick={() => setAssigning(true)}>
                  <Icon name="plus" /> Assign people by email
                </button>
              </div>
            )}
            <Panel title={`Mentors (${p.mentors.length})`}>
              {p.mentors.length ? (
                <ul className="people-grid">
                  {p.mentors.map((m) => (
                    <li key={m.id} className="person-card">
                      <Avatar name={m.name} size={44} />
                      <span className="grow">
                        <b>{m.name}</b>
                        <small className="mu">{m.email}</small>
                      </span>
                      {admin && remove(m, "mentor")}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mu">No mentor assigned yet.</p>
              )}
            </Panel>
            {course.canManage && (
              <Panel
                title={`Students (${p.students.length})`}
                action={
                  <label className="search sm">
                    <Icon name="search" size={16} />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students" aria-label="Search students" />
                  </label>
                }
              >
                {students.length ? (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr><th>Student</th><th>Phone</th><th>Enrolled</th><th>Submissions</th><th>Average</th>{admin && <th aria-label="Actions" />}</tr>
                      </thead>
                      <tbody>
                        {students.map((s) => (
                          <tr key={s.id}>
                            <td>
                              <span className="person">
                                <Avatar name={s.name} size={30} />
                                <span><b>{s.name}</b><small className="mu">{s.email}</small></span>
                              </span>
                            </td>
                            <td>{s.phone || <span className="mu">—</span>}</td>
                            <td>{date(s.enrolledAt)}</td>
                            <td>{s.submitted}/{s.assignments}</td>
                            <td>{s.average == null ? "—" : <Badge tone={s.average >= 75 ? "ok" : s.average >= 50 ? "warn" : "er"}>{s.average}%</Badge>}</td>
                            {admin && <td className="right">{remove(s, "student")}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty icon="users" title={p.students.length ? "No students match" : "No students yet"}>
                    {admin ? "Assign students to this course by email." : "Your admin will enroll students."}
                  </Empty>
                )}
              </Panel>
            )}
            <Modal open={assigning} onClose={() => setAssigning(false)} title={`Assign people to ${course.name}`}>
              {assigning && <AssignForm courseId={course.id} onDone={refresh} />}
            </Modal>
          </>
        );
      }}
    </Async>
  );
}
