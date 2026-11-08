"use client";

import Link from "next/link";
import { useCourse } from "@/components/CourseContext";
import { Async, Badge, Empty, Panel, Stat } from "@/components/ui/bits";
import { useApi, useNow } from "@/lib/hooks";
import { dateTime } from "@/lib/time";
import type { Assignment, PersonLite, Submission } from "@/lib/types";

type Grades = { assignments: Assignment[]; students: PersonLite[]; submissions: Submission[] };

const pct = (marks: number, max: number) => Math.round((marks / max) * 100);

function StudentGrades({ g, courseId }: { g: Grades; courseId: string }) {
  const now = useNow();
  const graded = g.submissions.filter((s) => s.marks != null);
  const total = graded.reduce((t, s) => t + s.marks!, 0);
  const possible = graded.reduce((t, s) => t + (g.assignments.find((a) => a.id === s.g)?.maxMarks ?? 0), 0);
  return (
    <>
      <div className="stats">
        <Stat icon="clipboard" label="Assignments" value={g.assignments.length} />
        <Stat icon="file" label="Submitted" value={g.submissions.length} />
        <Stat icon="award" label="Graded" value={graded.length} />
        <Stat icon="chart" label="Overall" value={possible ? `${pct(total, possible)}%` : "—"} hint={possible ? `${total}/${possible} marks` : undefined} tone="ok" />
      </div>
      <Panel title="Your grades">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Assignment</th><th>Deadline</th><th>Status</th><th>Grade</th></tr>
            </thead>
            <tbody>
              {g.assignments.map((a) => {
                const s = g.submissions.find((x) => x.g === a.id);
                return (
                  <tr key={a.id}>
                    <td><Link className="strong-link" href={`/courses/${courseId}/assignments/${a.id}`}>{a.title}</Link></td>
                    <td>{dateTime(a.dueAt)}</td>
                    <td>{s ? <Badge tone={s.late ? "warn" : "info"}>{s.late ? "Late" : "Submitted"}</Badge> : <Badge tone={a.dueAt < now ? "er" : "mu"}>{a.dueAt < now ? "Missing" : "Not yet"}</Badge>}</td>
                    <td>{s?.marks != null ? <b>{s.marks}/{a.maxMarks} <span className="mu">({pct(s.marks, a.maxMarks)}%)</span></b> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function Gradebook({ g, courseId }: { g: Grades; courseId: string }) {
  const cell = (sid: string, a: Assignment) => g.submissions.find((s) => s.s === sid && s.g === a.id);
  const avg = (sid: string) => {
    const gs = g.assignments.map((a) => ({ a, s: cell(sid, a) })).filter((x) => x.s?.marks != null);
    return gs.length ? Math.round(gs.reduce((t, x) => t + pct(x.s!.marks!, x.a.maxMarks), 0) / gs.length) : null;
  };
  const csv = () => {
    const head = ["Student", "Email", ...g.assignments.map((a) => `${a.title} (/${a.maxMarks})`), "Average %"];
    const lines = g.students.map((u) => [u.name, u.email ?? "", ...g.assignments.map((a) => cell(u.id, a)?.marks ?? ""), avg(u.id) ?? ""]);
    const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
    const blob = new Blob([[head, ...lines].map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gradebook.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  if (!g.students.length || !g.assignments.length)
    return <Empty icon="award" title="Gradebook is empty">{g.students.length ? "Publish an assignment to start grading." : "No students are enrolled yet."}</Empty>;
  return (
    <Panel title="Gradebook" action={<button className="btn ghost sm" onClick={csv}>Export CSV</button>}>
      <div className="table-wrap">
        <table className="table gradebook">
          <thead>
            <tr>
              <th>Student</th>
              {g.assignments.map((a) => (
                <th key={a.id}><Link href={`/courses/${courseId}/assignments/${a.id}`}>{a.title}</Link><small>/{a.maxMarks}</small></th>
              ))}
              <th>Average</th>
            </tr>
          </thead>
          <tbody>
            {g.students.map((u) => {
              const av = avg(u.id);
              return (
                <tr key={u.id}>
                  <td><b>{u.name}</b></td>
                  {g.assignments.map((a) => {
                    const s = cell(u.id, a);
                    return (
                      <td key={a.id} className="center">
                        {s?.marks != null ? s.marks : s ? <Badge tone="warn">To grade</Badge> : <span className="mu">—</span>}
                      </td>
                    );
                  })}
                  <td className="center">{av == null ? "—" : <Badge tone={av >= 75 ? "ok" : av >= 50 ? "warn" : "er"}>{av}%</Badge>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default function GradesPage() {
  const { course } = useCourse();
  const q = useApi<Grades>(`/api/courses/${course.id}/grades`);
  return <Async q={q}>{(g) => (course.canManage ? <Gradebook g={g} courseId={course.id} /> : <StudentGrades g={g} courseId={course.id} />)}</Async>;
}
