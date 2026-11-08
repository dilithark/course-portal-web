"use client";

import { useRouter } from "next/navigation";
import { useAuth, useMe } from "@/components/auth/AuthProvider";
import { changePassword, passwordProblem } from "@/components/auth/ForcePasswordChange";
import { usePortal } from "@/components/shell/PortalContext";
import { ConfirmButton } from "@/components/ui/Confirm";
import { useToast } from "@/components/ui/Toast";
import { Avatar, Badge, ErrorText, PageHeader, Panel } from "@/components/ui/bits";
import { api } from "@/lib/api";
import { formObject, useAction } from "@/lib/hooks";
import { date } from "@/lib/time";
import type { Profile } from "@/lib/types";

export default function ProfilePage() {
  const me = useMe();
  const { setMe, signOut } = useAuth();
  const { courses } = usePortal();
  const router = useRouter();
  const toast = useToast();
  const details = useAction();
  const pw = useAction();

  return (
    <>
      <PageHeader title="Profile" sub="Your details and account security." />
      <div className="grid-2 wide-left">
        <Panel title="Personal details">
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              const p = await details.run(() => api<Profile>("/api/me", "PATCH", formObject(e.currentTarget)));
              if (p) {
                setMe(p);
                toast("Profile saved");
              }
            }}
          >
            <label className="field span-2">
              <span>Full name</span>
              <input name="name" defaultValue={me.name} required maxLength={120} autoComplete="name" />
            </label>
            <label className="field">
              <span>Email</span>
              <input value={me.email} disabled readOnly />
              <small className="mu">Ask an admin to change your email.</small>
            </label>
            <label className="field">
              <span>Phone</span>
              <input name="phone" type="tel" defaultValue={me.phone} maxLength={32} autoComplete="tel" placeholder="+94 77 123 4567" />
            </label>
            <label className="field span-2">
              <span>About you</span>
              <textarea name="bio" rows={3} defaultValue={me.bio} maxLength={1000} placeholder="A short intro for your mentors and classmates" />
            </label>
            <ErrorText err={details.error} />
            <div className="span-2 form-actions">
              <button className="btn" disabled={details.pending}>{details.pending ? "Saving…" : "Save details"}</button>
            </div>
          </form>
        </Panel>
        <Panel title="Account">
          <div className="profile-card">
            <Avatar name={me.name} size={72} />
            <h3>{me.name}</h3>
            <Badge tone={me.role === "admin" ? "br" : me.role === "mentor" ? "info" : "mu"}>{me.role === "admin" ? "Super admin" : me.role}</Badge>
            <p className="mu small">Member since {date(me.createdAt)}</p>
            {me.role !== "admin" && !!courses?.length && (
              <ul className="chips">
                {courses.map((c) => <li key={c.id}>{c.name}</li>)}
              </ul>
            )}
          </div>
        </Panel>
      </div>
      <div className="grid-2 wide-left">
        <Panel title="Change password">
          <form
            className="form-grid"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const d = formObject(form);
              const problem = passwordProblem(d.next, d.confirm, d.current);
              if (problem) return pw.setError(problem);
              const ok = await pw.run(async () => {
                await changePassword(d.current, d.next);
                return true;
              });
              if (ok) {
                form.reset();
                toast("Password changed");
              }
            }}
          >
            <label className="field span-2">
              <span>Current password</span>
              <input name="current" type="password" required autoComplete="current-password" maxLength={128} />
            </label>
            <label className="field">
              <span>New password</span>
              <input name="next" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
            </label>
            <label className="field">
              <span>Confirm new password</span>
              <input name="confirm" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
            </label>
            <p className="mu small span-2">At least 8 characters, mixing upper and lower case letters, numbers or symbols.</p>
            <ErrorText err={pw.error} />
            <div className="span-2 form-actions">
              <button className="btn" disabled={pw.pending}>{pw.pending ? "Updating…" : "Update password"}</button>
            </div>
          </form>
        </Panel>
        <Panel title="Sessions">
          <p className="mu">Signed in on a shared or lost device? Sign out everywhere to end every session, including this one.</p>
          <div className="form-actions">
            <button
              className="btn ghost"
              onClick={async () => {
                await signOut();
                router.replace("/login");
              }}
            >
              Sign out
            </button>
            <ConfirmButton
              className="btn danger"
              title="Sign out everywhere?"
              message="You’ll be signed out on all devices and will need to sign in again."
              confirmLabel="Sign out everywhere"
              onConfirm={async () => {
                await api("/api/me/sessions", "DELETE");
                await signOut("You were signed out on all devices.");
                router.replace("/login");
              }}
            >
              Sign out everywhere
            </ConfirmButton>
          </div>
        </Panel>
      </div>
    </>
  );
}
