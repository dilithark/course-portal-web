"use client";

import { useState } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { usePortal } from "@/components/shell/PortalContext";
import { ConfirmButton } from "@/components/ui/Confirm";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Async, Badge, Empty, ErrorText, PageHeader, Panel } from "@/components/ui/bits";
import { api } from "@/lib/api";
import { formObject, useAction, useApi } from "@/lib/hooks";
import { date } from "@/lib/time";
import type { CourseSummary, Invite } from "@/lib/types";

const inviteUrl = (id: string) => `${window.location.origin}/signup?invite=${id}`;

function InviteForm({ courses, onClose, onSaved, onCopy }: { courses: CourseSummary[]; onClose: () => void; onSaved: () => void; onCopy: (id: string) => void }) {
  const { run, pending, error } = useAction();
  const [created, setCreated] = useState<Invite | null>(null);
  if (created)
    return (
      <>
        <div className="modal-body form-grid">
          <label className="field span-2">
            <span>Send this link to {created.label || "the mentor"}</span>
            <div className="pw-field">
              <input value={inviteUrl(created.id)} readOnly onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className="icon-btn" onClick={() => onCopy(created.id)} aria-label="Copy invite link" title="Copy">
                <Icon name="clipboard" />
              </button>
            </div>
            <small className="mu">It works once. You can copy it again or revoke it from this page.</small>
          </label>
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn" onClick={onClose}>Done</button>
        </footer>
      </>
    );
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const d = formObject(e.currentTarget);
        const ids = Object.keys(d).filter((k) => k.startsWith("course:")).map((k) => k.slice(7));
        const inv = await run(() => api<Invite>("/api/admin/invites", "POST", { label: d.label, courses: ids }));
        if (inv) {
          setCreated(inv);
          onSaved();
        }
      }}
    >
      <div className="modal-body form-grid">
        <label className="field span-2">
          <span>Mentor’s name (optional)</span>
          <input name="label" maxLength={120} placeholder="e.g. Kasun Silva" />
          <small className="mu">Helps you track who the link is for, and fills in their name on the sign-up form.</small>
        </label>
        <fieldset className="field span-2 fieldset">
          <legend>Mentors these courses</legend>
          <div className="check-grid">
            {courses.map((c) => (
              <label key={c.id} className="check">
                <input type="checkbox" name={`course:${c.id}`} />
                <i className="dot" style={{ background: `hsl(${c.hue} 70% 52%)` }} /> {c.name}
              </label>
            ))}
          </div>
        </fieldset>
        <ErrorText err={error} />
      </div>
      <footer className="modal-foot">
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn" disabled={pending}>{pending ? "Creating…" : "Create link"}</button>
      </footer>
    </form>
  );
}

function Invites() {
  const { courses } = usePortal();
  const q = useApi<Invite[]>("/api/admin/invites");
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const courseName = new Map((courses ?? []).map((c) => [c.id, c.name]));
  const copy = async (id: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(id));
      toast("Invite link copied");
    } catch {
      toast("Couldn’t copy — select the link and copy it yourself", "er");
    }
  };

  return (
    <>
      <PageHeader
        title="Mentor invites"
        sub="Each link lets one mentor create their own account, already assigned to the courses you pick. Students sign up themselves at /signup."
        actions={<button className="btn" onClick={() => setOpen(true)}><Icon name="plus" /> New invite link</button>}
      />
      <Async q={q}>
        {(invites) => (
          <Panel title={`${invites.length} link${invites.length === 1 ? "" : "s"}`}>
            {invites.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>For</th><th>Courses</th><th>Status</th><th>Created</th><th aria-label="Actions" /></tr>
                  </thead>
                  <tbody>
                    {invites.map((inv) => (
                      <tr key={inv.id} className={inv.usedAt ? "muted-row" : ""}>
                        <td>{inv.label || <span className="mu">Any mentor</span>}</td>
                        <td><ul className="chips">{inv.courses.map((c) => <li key={c}>{courseName.get(c) ?? "Deleted course"}</li>)}</ul></td>
                        <td>{inv.usedAt ? <Badge tone="ok">Used by {inv.usedByName ?? "?"} · {date(inv.usedAt)}</Badge> : <Badge tone="warn">Not used yet</Badge>}</td>
                        <td>{date(inv.createdAt)}</td>
                        <td className="right">
                          <span className="row-actions">
                            {!inv.usedAt && (
                              <button className="icon-btn" aria-label="Copy invite link" title="Copy link" onClick={() => copy(inv.id)}><Icon name="clipboard" size={16} /></button>
                            )}
                            <ConfirmButton
                              className="icon-btn"
                              ariaLabel="Delete invite link"
                              title={inv.usedAt ? "Remove this link from the list?" : "Revoke this invite link?"}
                              message={inv.usedAt ? "The mentor’s account isn’t affected." : "Anyone holding the link won’t be able to sign up with it."}
                              confirmLabel={inv.usedAt ? "Remove" : "Revoke link"}
                              onConfirm={async () => {
                                await api(`/api/admin/invites/${inv.id}`, "DELETE");
                                toast(inv.usedAt ? "Link removed" : "Link revoked");
                                q.reload();
                              }}
                            >
                              <Icon name="trash" size={16} />
                            </ConfirmButton>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty icon="link" title="No invite links yet">Create one for each mentor and send it to them.</Empty>
            )}
          </Panel>
        )}
      </Async>
      <Modal open={open} onClose={() => setOpen(false)} title="New mentor invite link" wide>
        {open && (
          <InviteForm
            courses={courses ?? []}
            onClose={() => setOpen(false)}
            onSaved={q.reload}
            onCopy={copy}
          />
        )}
      </Modal>
    </>
  );
}

export default function Page() {
  return (
    <RequireRole roles={["admin"]}>
      <Invites />
    </RequireRole>
  );
}
