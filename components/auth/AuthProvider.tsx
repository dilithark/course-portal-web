"use client";

import { signInWithEmailAndPassword, signOut as fbSignOut } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError, SESSION_EXPIRED } from "@/lib/api";
import { clientAuth } from "@/lib/firebase";
import type { Profile } from "@/lib/types";

type Status = "loading" | "signedOut" | "ready";

type Auth = {
  status: Status;
  me: Profile | null;
  /** Message shown on the login page after an expired/suspended session. */
  notice: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: (notice?: string) => Promise<void>;
  setMe: (p: Profile) => void;
};

const Ctx = createContext<Auth | null>(null);

export function useAuth() {
  const a = useContext(Ctx);
  if (!a) throw new Error("useAuth must be used inside <AuthProvider>");
  return a;
}

/** The signed-in profile; only use inside the portal, where the layout guarantees it. */
export function useMe() {
  const { me } = useAuth();
  if (!me) throw new Error("useMe used without a signed-in user");
  return me;
}

const SIGN_IN_ERRORS: Record<string, string> = {
  "auth/invalid-credential": "Wrong email or password.",
  "auth/invalid-email": "That email address isn’t valid.",
  "auth/user-disabled": "This account is suspended. Contact your course admin.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
  "auth/network-request-failed": "Can’t reach the server. Check your connection and try again.",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [me, setMe] = useState<Profile | null>(null);
  const [notice, setNotice] = useState("");

  const signOut = useCallback(async (msg = "") => {
    await fbSignOut(clientAuth()).catch(() => {});
    setMe(null);
    setNotice(msg);
    setStatus("signedOut");
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const auth = clientAuth();
      await auth.authStateReady();
      if (!auth.currentUser) return alive && setStatus("signedOut");
      try {
        const p = await api<Profile>("/api/me");
        if (alive) {
          setMe(p);
          setStatus("ready");
        }
      } catch (e) {
        if (alive) await signOut(e instanceof ApiError ? e.message : "");
      }
    })();
    const onExpired = (e: Event) => signOut((e as CustomEvent<string>).detail || "Your session expired. Sign in again.");
    window.addEventListener(SESSION_EXPIRED, onExpired);
    return () => {
      alive = false;
      window.removeEventListener(SESSION_EXPIRED, onExpired);
    };
  }, [signOut]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setNotice("");
      try {
        await signInWithEmailAndPassword(clientAuth(), email.trim(), password);
      } catch (e) {
        throw new Error(SIGN_IN_ERRORS[(e as { code?: string }).code ?? ""] ?? "Couldn’t sign in. Try again.");
      }
      try {
        setMe(await api<Profile>("/api/me"));
        setStatus("ready");
      } catch (e) {
        await fbSignOut(clientAuth());
        throw e;
      }
    },
    [],
  );

  const value = useMemo(() => ({ status, me, notice, signIn, signOut, setMe }), [status, me, notice, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
