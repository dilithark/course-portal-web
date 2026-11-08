"use client";

import { useState } from "react";
import { BulkImport } from "@/components/BulkImport";
import { RequireRole } from "@/components/auth/RequireRole";
import { useMe } from "@/components/auth/AuthProvider";
import { usePortal } from "@/components/shell/PortalContext";
import { ConfirmButton } from "@/components/ui/Confirm";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Async, Avatar, Badge, Empty, ErrorText, PageHeader, Panel, Stat } from "@/components/ui/bits";
import { api } from "@/lib/api";
import { formObject, useAction, useApi } from "@/lib/hooks";
import { date } from "@/lib/time";
import type { CourseSummary, Profile, Role } from "@/lib/types";

type UserRow = Profile & { courses: string[] };

const ROLE_LABEL: Record<Role, string> = { admin: "Super admin", mentor: "Mentor", student: "Student" };
const ROLE_TONE: Record<Role, "br" | "info" | "mu"> = { admin: "br", mentor: "info", student: "mu" };

/** Random 14-char password from an unambiguous alphabet, using the browser's CSPRNG. */
function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function CoursePicker({ courses, selected, role }: { courses: CourseSummary[]; selected: string[]; role: Role }) {
  if (role === "admin") return <p className="mu small span-2">Super admins can manage every course.</p>;
  return (
    <fieldset className="field span-2 fieldset">
      <legend>{role === "mentor" ? "Mentors these courses" : "Enrolled in"}</legend>
      <div className="check-grid">
        {courses.map((c) => (
          <label key={c.id} className="check">
            <input type="checkbox" name={`course:${c.id}`} defaultChecked={selected.includes(c.id)} />
            <i className="dot" style={{ background: `hsl(${c.hue} 70% 52%)` }} /> {c.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const pickCourses = (d: Record<string, string>) => Object.keys(d).filter((k) => k.startsWith("course:")).map((k) => k.slice(7));

function UserForm({ user, courses, onClose, onSaved }: { user?: UserRow; courses: CourseSummary[]; onClose: () => void; onSaved: () => void }) {
  const me = useMe();
  const { run, pending, error } = useAction();
  const toast = useToast();
  const [role, setRole] = useState<Role>(user?.role ?? "student");
  const [password, setPassword] = useState(user ? "" : generatePassword());
  const self = user?.id === me.id;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const d = formObject(e.currentTarget);
        const payload = { name: d.name, role, courses: pickCourses(d), ...(user ? { disabled: d.disabled === "on" } : { email: d.email, password }) };
        const ok = await run(() => api(user ? `/api/admin/users/${user.id}` : "/api/admin/users", user ? "PATCH" : "POST", payload));
        if (ok !== undefined) {
          toast(user ? "User updated" : `Account created for ${d.email} — share the password with them privately`);
          onSaved();
          onClose();
        }
      }}
    >
      <div className="modal-body form-grid">
        <label className="field span-2">
          <span>Full name</span>
          <input name="name" defaultValue={user?.name} required maxLength={120} />
        </label>
        {!user && (
          <>
            <label className="field">
              <span>Email (their username)</span>
              <input name="email" type="email" required maxLength={254} autoComplete="off" />
            </label>
            <label className="field">
              <span>Starting password</span>
              <div className="pw-field">
                <input value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={128} autoComplete="new-password" />
                <button type="button" className="icon-btn" onClick={() => setPassword(generatePassword())} aria-label="Generate a new password" title="Generate">
                  <Icon name="lock" />
                </button>
              </div>
              <small className="mu">Temporary — they’ll choose their own on first sign-in.</small>
            </label>
          </>
        )}
        <fieldset className="field span-2 fieldset">
          <legend>Role</legend>
          <div className="seg">
            {(["student", "mentor", "admin"] as Role[]).map((r) => (
              <button key={r} type="button" className={role === r ? "on" : ""} onClick={() => setRole(r)} disabled={self && r !== "admin"}>
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </fieldset>
        <CoursePicker courses={courses} selected={user?.courses ?? []} role={role} />
        {user && !self && (
          <label className="check span-2">
            <input type="checkbox" name="disabled" defaultChecked={user.disabled} />
            Suspend this account (signs them out and blocks sign-in)
          </label>
        )}
        <ErrorText err={error} />
      </div>
      <footer className="modal-foot">
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn" disabled={pending}>{pending ? "Saving…" : user ? "Save changes" : "Create account"}</button>
      </footer>
    </form>
  );
}

function PasswordForm({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const { run, pending, error } = useAction();
  const toast = useToast();
  const [password, setPassword] = useState(generatePassword);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(() => api(`/api/admin/users/${user.id}/password`, "PUT", { password }));
        if (ok !== undefined) {
          toast(`Password reset for ${user.name}`);
          onClose();
        }
      }}
    >
      <div className="modal-body form-grid">
        <label className="field span-2">
          <span>New password for {user.email}</span>
          <div className="pw-field">
            <input value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={128} autoComplete="new-password" />
            <button type="button" className="icon-btn" onClick={() => navigator.clipboard?.writeText(password)} aria-label="Copy password" title="Copy">
              <Icon name="clipboard" />
            </button>
          </div>
          <small className="mu">They’ll be signed out everywhere and must use the new password.</small>
        </label>
        <ErrorText err={error} />
      </div>
      <footer className="modal-foot">
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn" disabled={pending}>{pending ? "Saving…" : "Reset password"}</button>
      </footer>
    </form>
  );
}

function Users() {
  const me = useMe();
  const { courses, reloadCourses } = usePortal();
  const q = useApi<UserRow[]>("/api/admin/users");
  const [modal, setModal] = useState<{ kind: "create" | "bulk" } | { kind: "edit" | "password"; user: UserRow } | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"all" | Role>("all");
  const [course, setCourse] = useState("all");
  const toast = useToast();
  const close = () => setModal(null);
  const saved = () => {
    q.reload();
    reloadCourses();
  };
  const courseName = new Map((courses ?? []).map((c) => [c.id, c.name]));

  return (
    <>
      <PageHeader
        title="Users"
        sub="Assign people to courses. Students create their own accounts at /signup; mentors use an invite link."
        actions={
          <>
            <button className="btn ghost" onClick={() => setModal({ kind: "bulk" })}><Icon name="users" /> Bulk import</button>
            <button className="btn" onClick={() => setModal({ kind: "create" })}><Icon name="plus" /> Add user</button>
          </>
        }
      />
      <Async q={q}>
        {(users) => {
          const list = users
            .filter((u) => role === "all" || u.role === role)
            .filter((u) => course === "all" || (course === "none" ? u.role !== "admin" && !u.courses.length : u.courses.includes(course)))
            .filter((u) => (u.name + u.email).toLowerCase().includes(search.toLowerCase()));
          return (
            <>
              <div className="stats">
                <Stat icon="users" label="Students" value={users.filter((u) => u.role === "student").length} />
                <Stat icon="user" label="Mentors" value={users.filter((u) => u.role === "mentor").length} />
                <Stat icon="shield" label="Super admins" value={users.filter((u) => u.role === "admin").length} />
                <Stat icon="lock" label="Suspended" value={users.filter((u) => u.disabled).length} />
              </div>
              <Panel
                title={`${list.length} user${list.length === 1 ? "" : "s"}`}
                action={
                  <div className="filters">
                    <label className="search sm">
                      <Icon name="search" size={16} />
                      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" aria-label="Search users" />
                    </label>
                    <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} aria-label="Filter by role">
                      <option value="all">All roles</option>
                      <option value="student">Students</option>
                      <option value="mentor">Mentors</option>
                      <option value="admin">Super admins</option>
                    </select>
                    <select value={course} onChange={(e) => setCourse(e.target.value)} aria-label="Filter by course">
                      <option value="all">All courses</option>
                      <option value="none">No courses yet</option>
                      {courses?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                }
              >
                {list.length ? (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr><th>User</th><th>Role</th><th>Courses</th><th>Joined</th><th aria-label="Actions" /></tr>
                      </thead>
                      <tbody>
                        {list.map((u) => (
                          <tr key={u.id} className={u.disabled ? "muted-row" : ""}>
                            <td>
                              <span className="person">
                                <Avatar name={u.name} size={32} />
                                <span>
                                  <b>{u.name} {u.id === me.id && <span className="mu">(you)</span>}</b>
                                  <small className="mu">{u.email}</small>
                                </span>
                              </span>
                            </td>
                            <td>
                              <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge> {u.disabled && <Badge tone="er">Suspended</Badge>}
                              {!u.disabled && u.mustChangePassword && u.id !== me.id && <Badge tone="warn">Awaiting first sign-in</Badge>}
                            </td>
                            <td>
                              {u.role === "admin" ? <span className="mu">All</span> : u.courses.length ? (
                                <ul className="chips">{u.courses.map((c) => <li key={c}>{courseName.get(c) ?? "?"}</li>)}</ul>
                              ) : <span className="mu">None</span>}
                            </td>
                            <td>{date(u.createdAt)}</td>
                            <td className="right">
                              <span className="row-actions">
                                <button className="icon-btn" aria-label={`Edit ${u.name}`} title="Edit" onClick={() => setModal({ kind: "edit", user: u })}><Icon name="edit" size={16} /></button>
                                <button className="icon-btn" aria-label={`Reset password for ${u.name}`} title="Reset password" onClick={() => setModal({ kind: "password", user: u })}><Icon name="lock" size={16} /></button>
                                {u.id !== me.id && (
                                  <ConfirmButton
                                    className="icon-btn"
                                    ariaLabel={`Delete ${u.name}`}
                                    title={`Delete ${u.name}?`}
                                    message="Their account, course memberships and submissions will be permanently deleted. To keep their work, suspend the account instead."
                                    confirmLabel="Delete account"
                                    onConfirm={async () => {
                                      await api(`/api/admin/users/${u.id}`, "DELETE");
                                      toast(`${u.name} deleted`);
                                      saved();
                                    }}
                                  >
                                    <Icon name="trash" size={16} />
                                  </ConfirmButton>
                                )}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty icon="users" title="No users match" />
                )}
              </Panel>
            </>
          );
        }}
      </Async>
      <Modal open={modal?.kind === "create" || modal?.kind === "edit"} onClose={close} title={modal?.kind === "edit" ? `Edit ${modal.user.name}` : "Add user"} wide>
        {(modal?.kind === "create" || modal?.kind === "edit") && (
          <UserForm key={modal.kind === "edit" ? modal.user.id : "new"} user={modal.kind === "edit" ? modal.user : undefined} courses={courses ?? []} onClose={close} onSaved={saved} />
        )}
      </Modal>
      <Modal open={modal?.kind === "bulk"} onClose={close} title="Bulk import users" wide>
        {modal?.kind === "bulk" && <BulkImport courses={courses ?? []} onDone={saved} onClose={close} />}
      </Modal>
      <Modal open={modal?.kind === "password"} onClose={close} title="Reset password">
        {modal?.kind === "password" && <PasswordForm user={modal.user} onClose={close} />}
      </Modal>
    </>
  );
}

export default function Page() {
  return (
    <RequireRole roles={["admin"]}>
      <Users />
    </RequireRole>
  );
}
