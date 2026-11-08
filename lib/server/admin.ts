import { randomBytes, randomInt } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import type { Course, Role } from "@/lib/types";
import { adminAuth, db } from "./firebase";
import { HttpError, int, str } from "./http";

export const ROLES = ["admin", "mentor", "student"] as const satisfies readonly Role[];

export function password(v: unknown) {
  const p = typeof v === "string" ? v : "";
  if (p.length < 8) throw new HttpError(400, "Passwords need at least 8 characters.");
  if (p.length > 128) throw new HttpError(400, "Passwords can be at most 128 characters.");
  return p;
}

export function courseIds(v: unknown): string[] {
  return Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && !!x))].slice(0, 50) : [];
}

/** Makes the user's course memberships match `ids` for their role (enrollments for students, mentor slots for mentors). */
export async function setMemberships(uid: string, role: Role, ids: string[]) {
  const courses = (await db().collection("courses").get()).docs.map((d) => ({ id: d.id, ...d.data() }) as Course);
  const known = new Set(courses.map((c) => c.id));
  const wanted = new Set(role === "admin" ? [] : ids.filter((id) => known.has(id)));
  const w = db().bulkWriter();
  for (const c of courses) {
    const ref = db().collection("courses").doc(c.id);
    const isMentor = c.mentors.includes(uid);
    if (role === "mentor" && wanted.has(c.id) && !isMentor) w.update(ref, { mentors: FieldValue.arrayUnion(uid) });
    if ((role !== "mentor" || !wanted.has(c.id)) && isMentor) w.update(ref, { mentors: FieldValue.arrayRemove(uid) });
  }
  const enr = await db().collection("enrollments").where("s", "==", uid).get();
  const enrolled = new Set(enr.docs.map((d) => d.get("c") as string));
  for (const d of enr.docs) if (role !== "student" || !wanted.has(d.get("c"))) w.delete(d.ref);
  if (role === "student")
    for (const c of wanted) if (!enrolled.has(c)) w.set(db().collection("enrollments").doc(`${c}_${uid}`), { c, s: uid, createdAt: Date.now() });
  await w.close();
}

export function courseFields(b: Record<string, unknown>) {
  return {
    name: str(b.name, 120, "Course name"),
    code: str(b.code, 12, "Course code").toUpperCase(),
    desc: str(b.desc, 1000),
    hue: int(b.hue ?? 350, 0, 359, "Colour"),
  };
}

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** 14 characters from an unambiguous alphabet, guaranteed to mix letters, digits and a symbol. */
export function generatePassword() {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!@#$%*?"];
  const all = sets.join("");
  const chars = sets.map((s) => s[randomInt(s.length)]);
  while (chars.length < 14) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/** Which of `emails` already have an account — in the portal, or only in Firebase Auth (an orphaned login). */
export async function existingAccounts(emails: string[]) {
  const out = new Map<string, { email: string; name?: string; role?: Role; where: "portal" | "auth-only" }>();
  const unique = [...new Set(emails.map((e) => e.toLowerCase()))];
  for (let i = 0; i < unique.length; i += 100) {
    const r = await adminAuth().getUsers(unique.slice(i, i + 100).map((email) => ({ email })));
    for (const u of r.users) if (u.email) out.set(u.email.toLowerCase(), { email: u.email.toLowerCase(), where: "auth-only" });
  }
  for (let i = 0; i < unique.length; i += 30) {
    const snap = await db().collection("users").where("email", "in", unique.slice(i, i + 30)).get();
    for (const d of snap.docs) out.set(d.get("email"), { email: d.get("email"), name: d.get("name"), role: d.get("role"), where: "portal" });
  }
  return out;
}

/** Creates the Firebase Auth login, the users/{uid} profile and course memberships. */
export async function createAccount(a: { name: string; email: string; role: Role; password: string; courses: string[]; mustChangePassword: boolean }) {
  const u = await adminAuth().createUser({ email: a.email, password: a.password, displayName: a.name });
  try {
    await db().collection("users").doc(u.uid).set({
      name: a.name, email: a.email, role: a.role, phone: "", bio: "", disabled: false, mustChangePassword: a.mustChangePassword, createdAt: Date.now(),
    });
    await setMemberships(u.uid, a.role, a.courses);
  } catch (e) {
    // Don't leave a login without a profile behind.
    await adminAuth().deleteUser(u.uid).catch(() => {});
    throw e;
  }
  return u.uid;
}

export async function courseNames(ids: string[]) {
  if (!ids.length) return [];
  const snaps = await db().getAll(...ids.map((id) => db().collection("courses").doc(id)));
  return snaps.filter((s) => s.exists).map((s) => s.get("name") as string);
}

/** Invite tokens are the doc ids of `invites/*`; reject anything else before touching Firestore. */
export const INVITE_TOKEN = /^[A-Za-z0-9_-]{24,64}$/;

export const newInviteToken = () => randomBytes(18).toString("base64url");
