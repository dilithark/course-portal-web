import { clientAuth } from "./firebase";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Fired when the server rejects the session, so the auth layer can sign out. */
export const SESSION_EXPIRED = "rla:session-expired";

export async function api<T = unknown>(path: string, method = "GET", body?: unknown): Promise<T> {
  const tok = await clientAuth().currentUser?.getIdToken();
  let r: Response;
  try {
    r = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Can’t reach the server. Check your connection and try again.", 0);
  }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 && typeof window !== "undefined") window.dispatchEvent(new CustomEvent(SESSION_EXPIRED, { detail: d.error }));
    throw new ApiError(d.error || "Something went wrong. Try again.", r.status);
  }
  return d as T;
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
