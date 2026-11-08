"use client";

import { useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { downloadFile, parsePeople, toCsv } from "@/lib/csv";
import { useAction } from "@/lib/hooks";
import type { BulkResult, CourseSummary, Role } from "@/lib/types";
import { Icon } from "./ui/Icon";
import { useToast } from "./ui/Toast";
import { Badge, ErrorText, Stat } from "./ui/bits";

type Existing = { email: string; name?: string; role?: Role; where: "portal" | "auth-only" };
type Row = {
  key: number;
  name: string;
  email: string;
  role: Role;
  courses: string[];
  guessedName?: boolean;
  /** Blocking problem — the row is skipped. */
  problem?: string;
  /** Non-blocking note shown in the review. */
  warning?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ROLE_NAME: Record<Role, string> = { admin: "an admin", mentor: "a mentor", student: "a student" };
const ROLE_WORDS: Record<string, Role> = { student: "student", students: "student", learner: "student", mentor: "mentor", mentors: "mentor", teacher: "mentor", instructor: "mentor", lecturer: "mentor", admin: "admin", "super admin": "admin", superadmin: "admin" };
const MAX = 200;
const SAMPLE = "name,email,role,courses\nJane Perera,jane@example.com,student,WEB;VED\nKasun Silva,kasun@example.com,mentor,LIV";

/** Flags rows that can't be created: bad data, repeats within the list, or accounts that already exist. */
function validate(rows: Row[], existing: Map<string, Existing>): Row[] {
  const seen = new Map<string, number>();
  return rows.map((r) => {
    let problem = r.problem;
    if (!problem && !r.name.trim()) problem = "Missing name";
    if (!problem && !EMAIL.test(r.email)) problem = r.email ? "Invalid email" : "Missing email";
    if (!problem && seen.has(r.email)) problem = `Duplicate of row ${seen.get(r.email)! + 1}`;
    const ex = existing.get(r.email);
    if (!problem && ex) problem = ex.where === "portal" ? `Already ${ex.role ? ROLE_NAME[ex.role] : "registered"}${ex.name ? ` — ${ex.name}` : ""}` : "Login already exists (no portal profile)";
    if (EMAIL.test(r.email) && !seen.has(r.email)) seen.set(r.email, r.key);
    return { ...r, problem };
  });
}

export function BulkImport({ courses, onDone, onClose }: { courses: CourseSummary[]; onDone: () => void; onClose: () => void }) {
  const [step, setStep] = useState<"input" | "review" | "results">("input");
  const [text, setText] = useState("");
  const [defaultRole, setDefaultRole] = useState<Role>("student");
  const [defaultCourses, setDefaultCourses] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [existing, setExisting] = useState<Map<string, Existing>>(new Map());
  const [results, setResults] = useState<BulkResult[]>([]);
  const [filter, setFilter] = useState<"all" | "ready" | "skipped">("all");
  const file = useRef<HTMLInputElement>(null);
  const check = useAction();
  const create = useAction();
  const toast = useToast();

  const courseLookup = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of courses) for (const k of [c.id, c.code, c.name]) m.set(k.toLowerCase(), c.id);
    return m;
  }, [courses]);
  const courseName = useMemo(() => new Map(courses.map((c) => [c.id, c.code])), [courses]);

  const validated = useMemo(() => validate(rows, existing), [rows, existing]);
  const ready = validated.filter((r) => !r.problem);
  const skipped = validated.filter((r) => r.problem);

  async function review() {
    const parsed = parsePeople(text);
    if (!parsed.length) return check.setError("Paste some rows or upload a CSV first.");
    if (parsed.length > MAX) return check.setError(`That’s ${parsed.length} rows — import at most ${MAX} at a time.`);
    const built: Row[] = parsed.map((p, i) => {
      const roleWord = p.role?.trim().toLowerCase();
      const role = roleWord ? ROLE_WORDS[roleWord] : defaultRole;
      const tokens = p.courses?.split(/[;|/]+/).map((t) => t.trim()).filter(Boolean) ?? [];
      const unknown = tokens.filter((t) => !courseLookup.has(t.toLowerCase()));
      const ids = tokens.length ? tokens.map((t) => courseLookup.get(t.toLowerCase())).filter((x): x is string => !!x) : defaultCourses;
      return {
        key: i,
        name: p.name,
        email: p.email.trim().toLowerCase(),
        role: role ?? defaultRole,
        courses: role === "admin" ? [] : [...new Set(ids)],
        guessedName: p.guessedName,
        problem: roleWord && !role ? `Unknown role “${p.role}”` : undefined,
        warning: unknown.length ? `Unknown course: ${unknown.join(", ")}` : undefined,
      };
    });
    const ok = await check.run(() => api<{ existing: Existing[] }>("/api/admin/users/check", "POST", { emails: built.map((r) => r.email).filter((e) => EMAIL.test(e)) }));
    if (!ok) return;
    setExisting(new Map(ok.existing.map((e) => [e.email, e])));
    setRows(built);
    setFilter("all");
    setStep("review");
  }

  async function submit() {
    const r = await create.run(() =>
      api<{ results: BulkResult[] }>("/api/admin/users/bulk", "POST", {
        users: ready.map(({ name, email, role, courses }) => ({ name, email, role, courses })),
      }),
    );
    if (!r) return;
    // Include rows we skipped client-side so the report covers the whole list.
    const skippedResults: BulkResult[] = skipped.map((s) => ({ email: s.email, name: s.name, status: s.problem?.startsWith("Duplicate") ? "duplicate" : s.problem?.startsWith("Already") || s.problem?.startsWith("Login") ? "exists" : "invalid", error: s.problem }));
    setResults([...r.results, ...skippedResults]);
    setStep("results");
    onDone();
    const created = r.results.filter((x) => x.status === "created").length;
    toast(`${created} account${created === 1 ? "" : "s"} created`);
  }

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  if (step === "input")
    return (
      <>
        <div className="modal-body form-grid">
          <div className="span-2 notice">
            <Icon name="file" />
            <span>
              Paste a list or upload a CSV with columns <b>name, email</b> and optionally <b>role, courses</b> (course codes like WEB;VED). One person per line also works: <code>Jane Perera, jane@example.com</code>.
            </span>
          </div>
          <label className="field span-2">
            <span className="row-between">
              People
              <span className="row-actions">
                <button type="button" className="link" onClick={() => setText(SAMPLE)}>Use example</button>
                <button type="button" className="link" onClick={() => downloadFile("users-template.csv", SAMPLE)}>Download template</button>
              </span>
            </span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder={SAMPLE} spellCheck={false} className="mono" />
          </label>
          <div className="span-2">
            <input
              ref={file}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 1_000_000) return check.setError("That file is over 1 MB.");
                setText(await f.text());
                e.target.value = "";
              }}
            />
            <button type="button" className="btn ghost sm" onClick={() => file.current?.click()}>
              <Icon name="file" size={16} /> Upload CSV
            </button>
          </div>
          <fieldset className="field span-2 fieldset">
            <legend>Defaults for rows without a role or courses</legend>
            <div className="seg">
              {(["student", "mentor"] as Role[]).map((r) => (
                <button key={r} type="button" className={defaultRole === r ? "on" : ""} onClick={() => setDefaultRole(r)}>
                  {r === "student" ? "Students" : "Mentors"}
                </button>
              ))}
            </div>
            <div className="check-grid">
              {courses.map((c) => (
                <label key={c.id} className="check">
                  <input
                    type="checkbox"
                    checked={defaultCourses.includes(c.id)}
                    onChange={(e) => setDefaultCourses((d) => (e.target.checked ? [...d, c.id] : d.filter((x) => x !== c.id)))}
                  />
                  <i className="dot" style={{ background: `hsl(${c.hue} 70% 52%)` }} /> {c.name}
                </label>
              ))}
            </div>
          </fieldset>
          <ErrorText err={check.error} />
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn" onClick={review} disabled={check.pending || !text.trim()}>
            {check.pending ? "Checking for duplicates…" : "Review list"}
          </button>
        </footer>
      </>
    );

  if (step === "review") {
    const shown = validated.filter((r) => filter === "all" || (filter === "ready" ? !r.problem : r.problem));
    return (
      <>
        <div className="modal-body">
          <div className="stats three">
            <Stat icon="users" label="In list" value={validated.length} />
            <Stat icon="check" label="Ready to create" value={ready.length} tone="ok" />
            <Stat icon="x" label="Will be skipped" value={skipped.length} tone={skipped.length ? "warn" : undefined} />
          </div>
          <div className="section-head">
            <div className="seg">
              {(["all", "ready", "skipped"] as const).map((f) => (
                <button key={f} type="button" className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
                  {f === "all" ? "All" : f === "ready" ? `Ready (${ready.length})` : `Skipped (${skipped.length})`}
                </button>
              ))}
            </div>
          </div>
          <div className="table-wrap bulk-table">
            <table className="table">
              <thead>
                <tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Courses</th><th>Status</th><th aria-label="Remove" /></tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.key} className={r.problem ? "muted-row" : ""}>
                    <td className="mu">{r.key + 1}</td>
                    <td>
                      <input className="cell-input" value={r.name} onChange={(e) => update(r.key, { name: e.target.value, guessedName: false })} aria-label={`Name for row ${r.key + 1}`} />
                      {r.guessedName && <small className="mu">Name guessed from email</small>}
                    </td>
                    <td>
                      <input className="cell-input" value={r.email} onChange={(e) => update(r.key, { email: e.target.value.trim().toLowerCase() })} aria-label={`Email for row ${r.key + 1}`} />
                    </td>
                    <td>
                      <select className="cell-input" value={r.role} onChange={(e) => update(r.key, { role: e.target.value as Role, problem: undefined })} aria-label={`Role for row ${r.key + 1}`}>
                        <option value="student">Student</option>
                        <option value="mentor">Mentor</option>
                        <option value="admin">Super admin</option>
                      </select>
                    </td>
                    <td>
                      {r.role === "admin" ? <span className="mu">All</span> : r.courses.length ? <ul className="chips">{r.courses.map((c) => <li key={c}>{courseName.get(c)}</li>)}</ul> : <span className="mu">None</span>}
                      {r.warning && <small className="warn-text">{r.warning}</small>}
                    </td>
                    <td>{r.problem ? <Badge tone={r.problem.startsWith("Already") || r.problem.startsWith("Login") || r.problem.startsWith("Duplicate") ? "warn" : "er"}>{r.problem}</Badge> : <Badge tone="ok">Ready</Badge>}</td>
                    <td>
                      <button type="button" className="icon-btn" aria-label={`Remove row ${r.key + 1}`} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                        <Icon name="x" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ErrorText err={create.error} />
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn ghost" onClick={() => setStep("input")} disabled={create.pending}>Back</button>
          <button type="button" className="btn" onClick={submit} disabled={create.pending || !ready.length}>
            {create.pending ? `Creating ${ready.length} account${ready.length === 1 ? "" : "s"}…` : `Create ${ready.length} account${ready.length === 1 ? "" : "s"}`}
          </button>
        </footer>
      </>
    );
  }

  const created = results.filter((r) => r.status === "created");
  const notCreated = results.filter((r) => r.status !== "created");
  const STATUS: Record<BulkResult["status"], [string, "ok" | "warn" | "er"]> = {
    created: ["Created", "ok"], exists: ["Already exists", "warn"], duplicate: ["Duplicate", "warn"], invalid: ["Invalid", "er"], failed: ["Failed", "er"],
  };
  return (
    <>
      <div className="modal-body">
        <div className="stats three">
          <Stat icon="users" label="In list" value={results.length} />
          <Stat icon="check" label="Created" value={created.length} tone="ok" />
          <Stat icon="x" label="Not created" value={notCreated.length} tone={notCreated.length ? "warn" : undefined} />
        </div>
        {!!created.length && (
          <div className="notice warn">
            <Icon name="lock" />
            <span>
              <b>Download the CSV now.</b> It contains their temporary passwords and won’t be shown again. Share it privately, then delete it.
            </span>
          </div>
        )}
        <div className="table-wrap bulk-table">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Result</th></tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td>{r.name}</td>
                  <td>{r.email}</td>
                  <td>
                    <Badge tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge>
                    {r.error && r.status !== "created" && <small className="mu block">{r.error}</small>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <footer className="modal-foot">
        <button
          type="button"
          className="btn ghost"
          onClick={() =>
            downloadFile(
              `import-results-${new Date().toISOString().slice(0, 10)}.csv`,
              toCsv([["Name", "Email", "Result", "Temporary password", "Note"], ...results.map((r) => [r.name, r.email, STATUS[r.status][0], r.password ?? "", r.error ?? ""])]),
            )
          }
        >
          Download results CSV
        </button>
        <button type="button" className="btn" onClick={onClose}>Done</button>
      </footer>
    </>
  );
}
