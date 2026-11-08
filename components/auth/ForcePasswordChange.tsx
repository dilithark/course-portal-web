"use client";

import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { api } from "@/lib/api";
import { clientAuth } from "@/lib/firebase";
import { formObject, useAction } from "@/lib/hooks";
import { ErrorText, Footer, Logo } from "../ui/bits";
import { useAuth, useMe } from "./AuthProvider";

const PW_ERRORS: Record<string, string> = {
  "auth/invalid-credential": "The temporary password is wrong. Use the one you were given.",
  "auth/wrong-password": "The temporary password is wrong. Use the one you were given.",
  "auth/weak-password": "Choose a stronger password.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
};

export function passwordProblem(next: string, confirm: string, current?: string) {
  if (next !== confirm) return "The new passwords don’t match.";
  if (next.length < 8) return "Use at least 8 characters.";
  let s = 0;
  if (/[a-z]/.test(next) && /[A-Z]/.test(next)) s++;
  if (/\d/.test(next)) s++;
  if (/[^A-Za-z0-9]/.test(next)) s++;
  if (next.length >= 12) s++;
  if (s < 2) return "Mix upper and lower case letters, numbers or symbols.";
  if (current && next === current) return "Choose a password different from the temporary one.";
  return "";
}

/** Changes the Firebase password after re-checking the current one, then clears the server-side prompt flag. */
export async function changePassword(current: string, next: string) {
  const user = clientAuth().currentUser!;
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email!, current));
    await updatePassword(user, next);
  } catch (err) {
    throw new Error(PW_ERRORS[(err as { code?: string }).code ?? ""] ?? "Couldn’t change your password. Try again.");
  }
  await api("/api/me/password-changed", "POST");
}

/** Shown instead of the portal until someone with a temporary password picks their own. */
export function ForcePasswordChange() {
  const me = useMe();
  const { setMe, signOut } = useAuth();
  const { run, pending, error, setError } = useAction();
  return (
    <div className="login-page">
      <header className="login-top">
        <Logo size={64} />
      </header>
      <main className="login-main">
        <h1>
          Welcome, <span className="o">{me.name.split(" ")[0]}</span>
        </h1>
        <p className="mu">You signed in with a temporary password. Choose your own to continue.</p>
        <form
          className="login-card"
          onSubmit={async (e) => {
            e.preventDefault();
            const d = formObject(e.currentTarget);
            const problem = passwordProblem(d.next, d.confirm, d.current);
            if (problem) return setError(problem);
            const ok = await run(async () => {
              await changePassword(d.current, d.next);
              return true;
            });
            if (ok) setMe({ ...me, mustChangePassword: false });
          }}
        >
          <label className="field">
            <span>Temporary password</span>
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
          <p className="mu small">At least 8 characters, mixing upper and lower case letters, numbers or symbols.</p>
          <ErrorText err={error} />
          <button className="btn block" disabled={pending}>{pending ? "Saving…" : "Set password and continue"}</button>
          <button type="button" className="link" onClick={() => signOut()}>Sign out</button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
