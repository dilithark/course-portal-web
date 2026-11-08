"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Icon } from "@/components/ui/Icon";
import { ContactButton, ErrorText, Footer, Loading, Logo } from "@/components/ui/bits";
import { api, errorMessage } from "@/lib/api";
import { useAction } from "@/lib/hooks";

type InviteInfo = { role: "mentor"; label: string; courses: string[] };

function SignupForm() {
  const { status, me, signIn, signOut } = useAuth();
  const router = useRouter();
  const token = useSearchParams().get("invite");
  const { run, pending, error } = useAction();
  const [show, setShow] = useState(false);
  const [invite, setInvite] = useState<{ info?: InviteInfo; error?: string; loading: boolean }>({ loading: !!token });
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!token) return;
    api<InviteInfo>(`/api/invites/${encodeURIComponent(token)}`)
      .then((info) => setInvite({ info, loading: false }))
      .catch((e) => setInvite({ error: errorMessage(e), loading: false }));
  }, [token]);

  if (invite.loading || status === "loading") return <Loading />;

  if (status === "ready" && !joining)
    return (
      <div className="login-card">
        <p>You’re already signed in as <b>{me?.email}</b>.</p>
        <Link className="btn block" href="/dashboard">Go to your dashboard</Link>
        {token && <button type="button" className="btn ghost block" onClick={() => signOut()}>Sign out to use this invite</button>}
      </div>
    );

  if (invite.error)
    return (
      <div className="login-card">
        <ErrorText err={invite.error} />
        <Link className="btn ghost block" href="/login">Go to sign in</Link>
      </div>
    );

  return (
    <form
      className="login-card"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const email = String(f.get("email")).trim();
        const password = String(f.get("password"));
        run(async () => {
          if (password !== f.get("confirm")) throw new Error("The two passwords don’t match.");
          await api("/api/signup", "POST", { name: f.get("name"), email, password, invite: token ?? undefined });
          setJoining(true);
          await signIn(email, password);
          router.replace("/dashboard");
        });
      }}
    >
      {invite.info && (
        <div className="notice">
          <Icon name="award" />
          <span>
            You’re joining as a <b>mentor</b> for <b>{invite.info.courses.join(", ")}</b>.
          </span>
        </div>
      )}
      <label className="field">
        <span>Full name</span>
        <input name="name" required maxLength={120} autoComplete="name" defaultValue={invite.info?.label} autoFocus />
      </label>
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required maxLength={254} />
      </label>
      <label className="field">
        <span>Password</span>
        <div className="pw-field">
          <input name="password" type={show ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} />
          <button type="button" className="icon-btn" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
            <Icon name="eye" />
          </button>
        </div>
        <small className="mu">At least 8 characters.</small>
      </label>
      <label className="field">
        <span>Confirm password</span>
        <input name="confirm" type={show ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} />
      </label>
      <ErrorText err={error} />
      <button className="btn block" disabled={pending}>
        {pending ? "Creating your account…" : "Create account"}
      </button>
      {!invite.info && <small className="mu">Your course admin will add you to your courses after you sign up.</small>}
    </form>
  );
}

export default function SignupPage() {
  return (
    <div className="login-page">
      <header className="login-top">
        <Logo size={64} />
        <ContactButton message="Hi Richmond Live Academy! I need help signing up for the course portal." />
      </header>
      <main className="login-main">
        <h1>
          Richmond Live <span className="o">Academy</span>
        </h1>
        <p className="mu">Create your account with your email.</p>
        <Suspense>
          <SignupForm />
        </Suspense>
        <p className="mu small">
          Already have an account? <Link className="link" href="/login">Sign in</Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
