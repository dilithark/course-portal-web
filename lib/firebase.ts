import { getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/** Browser Firebase Auth, created on first use so prerendering doesn't need config. */
export function clientAuth(): Auth {
  const app =
    getApps()[0] ??
    initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    });
  return getAuth(app);
}
