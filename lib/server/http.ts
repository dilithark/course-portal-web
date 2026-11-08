import type { DocumentSnapshot } from "firebase-admin/firestore";
import type { Course, Profile, Role } from "@/lib/types";
import { adminAuth, db } from "./firebase";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Params = Record<string, string>;

const AUTH_ERRORS: Record<string, string> = {
  "auth/email-already-exists": "Someone already uses that email.",
  "auth/invalid-email": "That email address isn’t valid.",
  "auth/invalid-password": "Passwords need at least 8 characters.",
  "auth/user-not-found": "That account no longer exists.",
};

/** Wraps a route handler: JSON response, HttpError -> status code, anything else -> 500. */
export function handler(fn: (req: Request, params: Params) => Promise<unknown>) {
  return async (req: Request, ctx: { params: Promise<Params> }) => {
    try {
      const res = Response.json((await fn(req, await ctx.params)) ?? { ok: true });
      res.headers.set("Cache-Control", "no-store");
      return res;
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      const code = (e as { code?: string }).code;
      const known = code && AUTH_ERRORS[code];
      if (known) return Response.json({ error: known }, { status: 400 });
      console.error(e);
      return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
    }
  };
}

export const docData = <T>(d: DocumentSnapshot) => ({ id: d.id, ...d.data() }) as T;

export async function currentUser(req: Request): Promise<Profile> {
  const h = req.headers.get("authorization") ?? "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) throw new HttpError(401, "Please sign in.");
  let uid: string;
  try {
    // checkRevoked: suspended accounts and "sign out everywhere" take effect immediately.
    uid = (await adminAuth().verifyIdToken(token, true)).uid;
  } catch {
    throw new HttpError(401, "Your session expired. Sign in again.");
  }
  const snap = await db().collection("users").doc(uid).get();
  if (!snap.exists) throw new HttpError(401, "This account doesn’t have portal access. Ask your course admin.");
  const me = docData<Profile>(snap);
  if (me.disabled) throw new HttpError(401, "This account is suspended. Contact your course admin.");
  return me;
}

export async function requireRole(req: Request, ...roles: Role[]) {
  const me = await currentUser(req);
  if (!roles.includes(me.role)) throw new HttpError(403, "You don’t have permission to do that.");
  return me;
}

export async function getCourse(id: string) {
  const snap = await db().collection("courses").doc(id).get();
  if (!snap.exists) throw new HttpError(404, "That course doesn’t exist.");
  return docData<Course>(snap);
}

export async function isEnrolled(courseId: string, uid: string) {
  return (await db().collection("enrollments").doc(`${courseId}_${uid}`).get()).exists;
}

/**
 * Loads a course and checks the caller belongs to it.
 * Admins and the course's mentors can manage; enrolled students can view.
 */
export async function courseAccess(req: Request, courseId: string, need: "view" | "manage" = "view") {
  const me = await currentUser(req);
  const course = await getCourse(courseId);
  const canManage = me.role === "admin" || (me.role === "mentor" && course.mentors.includes(me.id));
  if (!canManage) {
    if (need === "manage") throw new HttpError(403, "Only this course’s mentors can do that.");
    if (me.role !== "student" || !(await isEnrolled(courseId, me.id))) throw new HttpError(403, "You aren’t part of this course.");
  }
  return { me, course, canManage };
}

/** Loads a course-scoped doc and checks the caller may view/manage its course. */
export async function ownedDoc<T extends { c: string }>(req: Request, collection: string, id: string, need: "view" | "manage" = "manage") {
  const ref = db().collection(collection).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, "That item no longer exists.");
  const item = docData<T>(snap);
  const access = await courseAccess(req, item.c, need);
  return { ref, item, ...access };
}

export async function body(req: Request): Promise<Record<string, unknown>> {
  const b = await req.json().catch(() => null);
  return b && typeof b === "object" && !Array.isArray(b) ? b : {};
}

/** Trimmed string field; throws 400 when required (label given) and empty. */
export function str(v: unknown, max: number, label?: string) {
  const s = typeof v === "string" ? v.trim().slice(0, max) : "";
  if (label && !s) throw new HttpError(400, `${label} is required.`);
  return s;
}

export function httpUrl(v: unknown, label: string) {
  const s = str(v, 2000, label);
  try {
    if (/^https?:$/.test(new URL(s).protocol)) return s;
  } catch {}
  throw new HttpError(400, `${label} must be a full link starting with https://`);
}

export function int(v: unknown, min: number, max: number, label: string) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${label} must be a whole number from ${min} to ${max}.`);
  return n;
}

/** Epoch-ms timestamp. Optional fields return null when empty. */
export function time(v: unknown, label: string, required = true): number | null {
  if (v == null || v === "") {
    if (required) throw new HttpError(400, `${label} is required.`);
    return null;
  }
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < Date.UTC(2020, 0, 1) || n > Date.UTC(2100, 0, 1)) throw new HttpError(400, `${label} isn’t a valid date.`);
  return Math.round(n);
}

export function oneOf<T extends string>(v: unknown, options: readonly T[], label: string): T {
  if (typeof v === "string" && (options as readonly string[]).includes(v)) return v as T;
  throw new HttpError(400, `${label} must be one of: ${options.join(", ")}.`);
}
