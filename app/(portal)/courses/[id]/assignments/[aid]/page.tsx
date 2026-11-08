"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AssignmentForm } from "@/components/AssignmentForm";
import { useCourse } from "@/components/CourseContext";
import { ConfirmButton } from "@/components/ui/Confirm";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Async, Avatar, Badge, ErrorText, Ext, Panel, Stat } from "@/components/ui/bits";
import { api } from "@/lib/api";
import { formObject, useAction, useApi, useNow } from "@/lib/hooks";
import { dateTime, relative } from "@/lib/time";
import type { Assignment, PersonLite, Submission } from "@/lib/types";

type Detail = Assignment & {
  sessionTitle: string | null;
  canManage: boolean;
  mine?: Submission | null;
  rows?: { student: PersonLite; submission: Submission | null }[];
};

function SubmitPanel({ a, reload }: { a: Detail; reload: () => void }) {
  const { run, pending, error } = useAction();
  const toast = useToast();
  const now = useNow();
  const s = a.mine;
  const closed = now > a.dueAt && !a.allowLate;
  const graded = s?.marks != null;

  return (
    <Panel title="Your submission">
      {s ? (
        <div className="submission">
          <p>
            <Badge tone={graded ? "ok" : s.late ? "warn" : "info"}>{graded ? "Graded" : s.late ? "Submitted late" : "Submitted"}</Badge>{" "}
            <span className="mu small">{dateTime(s.submittedAt)}</span>
          </p>
          <Ext href={s.link} className="resource">
            <Icon name="link" />
            <span className="break">{s.link}</span>
            <Icon name="external" size={14} />
          </Ext>
          {s.note && <p className="pw small">{s.note}</p>}
          {graded && (
            <div className="grade-box">
              <p className="grade-score">
                {s.marks}<small>/{a.maxMarks}</small>
              </p>
              {s.feedback ? <p className="pw">{s.feedback}</p> : <p className="mu">No written feedback.</p>}
            </div>
          )}
        </div>
      ) : (
        <p className="mu">{closed ? "The deadline has passed and this assignment is closed." : "You haven’t submitted yet."}</p>
      )}
      {!graded && !closed && (
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(() => api(`/api/assignments/${a.id}/submission`, "PUT", formObject(e.currentTarget)));
            if (ok !== undefined) {
              toast(s ? "Submission updated" : "Submitted — good luck!");
              reload();
            }
          }}
        >
          <label className="field span-2">
            <span>Link to your work</span>
            <input name="link" type="url" required defaultValue={s?.link} placeholder="https://drive.google.com/… (make sure it’s shared)" />
          </label>
          <label className="field span-2">
            <span>Note for your mentor (optional)</span>
            <textarea name="note" rows={2} maxLength={2000} defaultValue={s?.note} />
          </label>
          <ErrorText err={error} />
          <div className="span-2 form-actions">
            {s && now <= a.dueAt && (
              <ConfirmButton
                className="btn ghost"
                title="Withdraw submission?"
                message="Your link will be removed. You can submit again before the deadline."
                confirmLabel="Withdraw"
                onConfirm={async () => {
                  await api(`/api/assignments/${a.id}/submission`, "DELETE");
                  reload();
                }}
              >
                Withdraw
              </ConfirmButton>
            )}
            <button className="btn" disabled={pending}>{pending ? "Submitting…" : s ? "Update submission" : "Submit"}</button>
          </div>
          {now > a.dueAt && <p className="mu small span-2">The deadline has passed — this will be marked late.</p>}
        </form>
      )}
    </Panel>
  );
}

function GradeForm({ s, max, onClose, onSaved }: { s: Submission; max: number; onClose: () => void; onSaved: () => void }) {
  const { run, pending, error } = useAction();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const d = formObject(e.currentTarget);
        const ok = await run(() => api(`/api/submissions/${s.id}/grade`, "PUT", { marks: Number(d.marks), feedback: d.feedback }));
        if (ok !== undefined) {
          onSaved();
          onClose();
        }
      }}
    >
      <div className="modal-body form-grid">
        <Ext href={s.link} className="resource span-2">
          <Icon name="link" />
          <span className="break">{s.link}</span>
          <Icon name="external" size={14} />
        </Ext>
        {s.note && <p className="pw small span-2 note">“{s.note}”</p>}
        <label className="field">
          <span>Marks (out of {max})</span>
          <input name="marks" type="number" min={0} max={max} required defaultValue={s.marks ?? ""} autoFocus />
        </label>
        <label className="field span-2">
          <span>Feedback</span>
          <textarea name="feedback" rows={4} maxLength={4000} defaultValue={s.feedback} placeholder="What went well, what to improve" />
        </label>
        <ErrorText err={error} />
      </div>
      <footer className="modal-foot">
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn" disabled={pending}>{pending ? "Saving…" : "Save grade"}</button>
      </footer>
    </form>
  );
}

function Submissions({ a, reload }: { a: Detail; reload: () => void }) {
  const [grading, setGrading] = useState<{ s: Submission; name: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "submitted" | "ungraded" | "missing">("all");
  const [q, setQ] = useState("");
  const rows = a.rows ?? [];
  const submitted = rows.filter((r) => r.submission);
  const graded = submitted.filter((r) => r.submission!.marks != null);
  const avg = graded.length ? Math.round(graded.reduce((t, r) => t + r.submission!.marks!, 0) / graded.length) : null;
  const shown = rows
    .filter((r) => filter === "all" || (filter === "submitted" ? r.submission : filter === "ungraded" ? r.submission && r.submission.marks == null : !r.submission))
    .filter((r) => (r.student.name + (r.student.email ?? "")).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="stats">
        <Stat icon="users" label="Students" value={rows.length} />
        <Stat icon="file" label="Submitted" value={submitted.length} hint={`${submitted.filter((r) => r.submission!.late).length} late`} />
        <Stat icon="award" label="Graded" value={graded.length} tone={graded.length === submitted.length ? "ok" : "warn"} />
        <Stat icon="chart" label="Average" value={avg == null ? "—" : `${avg}/${a.maxMarks}`} />
      </div>
      <Panel
        title="Submissions"
        action={
          <div className="filters">
            <label className="search sm">
              <Icon name="search" size={16} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students" aria-label="Search students" />
            </label>
            <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter submissions">
              <option value="all">All students</option>
              <option value="submitted">Submitted</option>
              <option value="ungraded">Needs grading</option>
              <option value="missing">Not submitted</option>
            </select>
          </div>
        }
      >
        {shown.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Submitted</th>
                  <th>Work</th>
                  <th>Grade</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {shown.map(({ student, submission: s }) => (
                  <tr key={student.id}>
                    <td>
                      <span className="person">
                        <Avatar name={student.name} size={30} />
                        <span>
                          <b>{student.name}</b>
                          <small className="mu">{student.email}</small>
                        </span>
                      </span>
                    </td>
                    <td>{s ? <>{dateTime(s.submittedAt)} {s.late && <Badge tone="warn">Late</Badge>}</> : <Badge tone="er">Missing</Badge>}</td>
                    <td>{s ? <Ext href={s.link} className="link">Open link <Icon name="external" size={12} /></Ext> : "—"}</td>
                    <td>{s?.marks != null ? <b>{s.marks}/{a.maxMarks}</b> : s ? <Badge tone="warn">Ungraded</Badge> : "—"}</td>
                    <td className="right">
                      {s && (
                        <button className="btn sm ghost" onClick={() => setGrading({ s, name: student.name })}>
                          {s.marks != null ? "Edit grade" : "Grade"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mu">{rows.length ? "No students match this filter." : "No students are enrolled in this course yet."}</p>
        )}
      </Panel>
      <Modal open={!!grading} onClose={() => setGrading(null)} title={grading ? `Grade ${grading.name}` : "Grade"}>
        {grading && <GradeForm key={grading.s.id} s={grading.s} max={a.maxMarks} onClose={() => setGrading(null)} onSaved={reload} />}
      </Modal>
    </>
  );
}

export default function AssignmentPage() {
  const { aid } = useParams<{ aid: string }>();
  const { course } = useCourse();
  const router = useRouter();
  const toast = useToast();
  const q = useApi<Detail>(`/api/assignments/${aid}`);
  const [editing, setEditing] = useState(false);
  const now = useNow();

  return (
    <Async q={q}>
      {(a) => {
        return (
          <>
            <Link href={`/courses/${course.id}/assignments`} className="crumb">← All assignments</Link>
            <div className="grid-2 wide-left">
              <Panel
                title={a.title}
                action={
                  a.canManage && (
                    <span className="row-actions">
                      <button className="btn ghost sm" onClick={() => setEditing(true)}>
                        <Icon name="edit" size={16} /> Edit
                      </button>
                      <ConfirmButton
                        title="Delete assignment?"
                        message="The assignment and every submission and grade for it will be deleted."
                        onConfirm={async () => {
                          await api(`/api/assignments/${a.id}`, "DELETE");
                          toast("Assignment deleted");
                          router.replace(`/courses/${course.id}/assignments`);
                        }}
                      >
                        <Icon name="trash" size={16} />
                      </ConfirmButton>
                    </span>
                  )
                }
              >
                <dl className="facts">
                  <div><dt>Deadline</dt><dd>{dateTime(a.dueAt)} <span className="mu">({relative(a.dueAt)})</span></dd></div>
                  <div><dt>Marks</dt><dd>{a.maxMarks}</dd></div>
                  <div><dt>Late work</dt><dd>{a.allowLate ? "Accepted, marked late" : "Not accepted"}</dd></div>
                  {a.sessionTitle && <div><dt>Session</dt><dd>{a.sessionTitle}</dd></div>}
                  {a.availableFrom && a.availableFrom > now && <div><dt>Visible from</dt><dd>{dateTime(a.availableFrom)}</dd></div>}
                </dl>
                <p className="pw">{a.desc || <span className="mu">No instructions provided.</span>}</p>
              </Panel>
              {!a.canManage && <SubmitPanel a={a} reload={q.reload} />}
            </div>
            {a.canManage && <Submissions a={a} reload={q.reload} />}
            <Modal open={editing} onClose={() => setEditing(false)} title="Edit assignment" wide>
              {editing && <AssignmentForm courseId={course.id} assignment={a} onClose={() => setEditing(false)} onSaved={q.reload} />}
            </Modal>
          </>
        );
      }}
    </Async>
  );
}
