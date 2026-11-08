"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Icon } from "@/components/ui/Icon";
import { ContactButton, ErrorText, Footer, Logo } from "@/components/ui/bits";
import { useAction } from "@/lib/hooks";

/** Only allow same-site relative paths, so ?next= can't redirect off-site. */
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : "/dashboard");

function LoginForm() {
  const { status, notice, signIn } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { run, pending, error } = useAction();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (status === "ready") router.replace(next);
  }, [status, next, router]);

  return (
    <form
      className="login-card"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        run(() => signIn(String(f.get("email")), String(f.get("password"))));
      }}
    >
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="username" required maxLength={254} autoFocus />
      </label>
      <label className="field">
        <span>Password</span>
        <div className="pw-field">
          <input name="password" type={show ? "text" : "password"} autoComplete="current-password" required maxLength={128} />
          <button type="button" className="icon-btn" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
            <Icon name="eye" />
          </button>
        </div>
      </label>
      <ErrorText err={error || notice} />
      <button className="btn block" disabled={pending || status === "loading"}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="login-page">
      <header className="login-top">
        <Logo size={64} />
        <ContactButton message="Hi Richmond Live Academy! I need help signing in to the course portal." />
      </header>
      <main className="login-main">
        <h1>
          Richmond Live <span className="o">Academy</span>
        </h1>
        <p className="mu">Sign in with your email and password.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="mu small">
          New here? <Link className="link" href="/signup">Create an account</Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
