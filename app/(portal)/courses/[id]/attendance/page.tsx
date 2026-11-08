"use client";

import { useMemo, useState } from "react";
import { useCourse } from "@/components/CourseContext";
import { Icon } from "@/components/ui/Icon";
import { Async, Avatar, Badge, Empty, Panel, Progress, Stat } from "@/components/ui/bits";
import { useApi } from "@/lib/hooks";
import { dateTime, time } from "@/lib/time";
import type { AttendanceRecord, AttendanceStatus, PersonLite } from "@/lib/types";

type Data = { demo: boolean; sessions: { id: string; title: string; startsAt: number; endsAt: number }[]; students: PersonLite[]; records: AttendanceRecord[] };

const TONE: Record<AttendanceStatus, "ok" | "warn" | "er"> = { present: "ok", late: "warn", absent: "er" };

function Report({ d }: { d: Data }) {
  const held = d.sessions.filter((s) => d.records.some((r) => r.session === s.id));
  const [session, setSession] = useState("all");
  const [status, setStatus] = useState<"all" | AttendanceStatus>("all");
  const [q, setQ] = useState("");
  const [below, setBelow] = useState(false);

  const rate = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of d.students) {
      const rs = d.records.filter((r) => r.student === u.id);
      m.set(u.id, rs.length ? Math.round((rs.filter((r) => r.status !== "absent").length / rs.length) * 100) : 0);
    }
    return m;
  }, [d]);

  if (!d.students.length) return <Empty icon="users" title="No students enrolled yet" />;
  if (!held.length) return <Empty icon="calendar" title="No sessions held yet">Attendance appears once a session has started.</Empty>;

  const names = new Map(d.students.map((u) => [u.id, u]));
  const titles = new Map(d.sessions.map((s) => [s.id, s]));
  const rows = d.records
    .filter((r) => session === "all" || r.session === session)
    .filter((r) => status === "all" || r.status === status)
    .filter((r) => !below || (rate.get(r.student) ?? 0) < 75)
    .filter((r) => (names.get(r.student)?.name + " " + names.get(r.student)?.email).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => titles.get(b.session)!.startsAt - titles.get(a.session)!.startsAt || names.get(a.student)!.name.localeCompare(names.get(b.student)!.name));
  const scope = d.records.filter((r) => session === "all" || r.session === session);
  const count = (s: AttendanceStatus) => scope.filter((r) => r.status === s).length;
  const overall = scope.length ? Math.round(((count("present") + count("late")) / scope.length) * 100) : 0;

  return (
    <>
      <div className="stats">
        <Stat icon="chart" label="Attendance rate" value={`${overall}%`} tone={overall >= 75 ? "ok" : "warn"} />
        <Stat icon="check" label="Present" value={count("present")} tone="ok" />
        <Stat icon="clock" label="Late" value={count("late")} tone="warn" />
        <Stat icon="x" label="Absent" value={count("absent")} />
      </div>
      <div className="grid-2 wide-left">
        <Panel
          title="Participants"
          action={
            <div className="filters">
              <label className="search sm">
                <Icon name="search" size={16} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search participants" />
              </label>
              <select value={session} onChange={(e) => setSession(e.target.value)} aria-label="Filter by session">
                <option value="all">All sessions</option>
                {held.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Filter by status">
                <option value="all">Any status</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
              </select>
              <label className="check">
                <input type="checkbox" checked={below} onChange={(e) => setBelow(e.target.checked)} /> Below 75%
              </label>
            </div>
          }
        >
          {rows.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Student</th><th>Session</th><th>Status</th><th>Joined</th><th>Time in session</th></tr></thead>
                <tbody>
                  {rows.map((r) => {
                    const u = names.get(r.student)!;
                    const s = titles.get(r.session)!;
                    return (
                      <tr key={r.session + r.student}>
                        <td><span className="person"><Avatar name={u.name} size={28} /><span><b>{u.name}</b><small className="mu">{u.email}</small></span></span></td>
                        <td>{s.title}<p className="mu small">{dateTime(s.startsAt)}</p></td>
                        <td><Badge tone={TONE[r.status]}>{r.status}</Badge></td>
                        <td>{r.joinedAt ? time(r.joinedAt) : "—"}</td>
                        <td>{r.minutes ? `${r.minutes} min` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mu">No records match these filters.</p>
          )}
        </Panel>
        <Panel title="By student">
          <ul className="list">
            {[...d.students].sort((a, b) => (rate.get(a.id) ?? 0) - (rate.get(b.id) ?? 0)).map((u) => (
              <li key={u.id} className="list-row">
                <div className="grow">
                  <b>{u.name}</b>
                  <Progress value={rate.get(u.id) ?? 0} max={100} />
                </div>
                <Badge tone={(rate.get(u.id) ?? 0) >= 75 ? "ok" : "er"}>{rate.get(u.id)}%</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

export default function AttendancePage() {
  const { course } = useCourse();
  const q = useApi<Data>(course.canManage ? `/api/courses/${course.id}/attendance` : null);
  if (!course.canManage) return <Empty icon="lock" title="Only mentors can view attendance" />;
  return (
    <>
      <div className="notice">
        <Icon name="eye" /> <span><b>Preview data.</b> Attendance tracking isn’t connected yet, so these records are generated samples.</span>
      </div>
      <Async q={q}>{(d) => <Report d={d} />}</Async>
    </>
  );
}
