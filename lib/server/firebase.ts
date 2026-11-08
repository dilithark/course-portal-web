import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldPath, getFirestore, type DocumentData } from "firebase-admin/firestore";

/** Lazily initialised so `next build` doesn't need credentials. */
function app(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail, FIREBASE_PRIVATE_KEY: key } = process.env;
  if (!projectId || !clientEmail || !key) throw new Error("Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key.replace(/\\n/g, "\n") }) });
}

export const adminAuth = () => getAuth(app());
export const db = () => getFirestore(app());

const chunks = <T>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/** All docs in `collection` where `field` is one of `values` (handles Firestore's 30-value `in` limit). */
export async function whereIn<T>(collection: string, field: string, values: string[]): Promise<T[]> {
  if (!values.length) return [];
  const key = field === "id" ? FieldPath.documentId() : field;
  const snaps = await Promise.all(chunks([...new Set(values)], 30).map((v) => db().collection(collection).where(key, "in", v).get()));
  return snaps.flatMap((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }) as T));
}

export async function whereEq<T>(collection: string, field: string, value: unknown): Promise<T[]> {
  const snap = await db().collection(collection).where(field, "==", value).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

/** Deletes every document in `collection` where `field == value`. */
export async function deleteWhere(collection: string, field: string, value: string) {
  const snap = await db().collection(collection).where(field, "==", value).get();
  if (snap.empty) return;
  const w = db().bulkWriter();
  snap.docs.forEach((d) => w.delete(d.ref));
  await w.close();
}

export async function updateWhere(collection: string, field: string, value: string, data: DocumentData) {
  const snap = await db().collection(collection).where(field, "==", value).get();
  if (snap.empty) return;
  const w = db().bulkWriter();
  snap.docs.forEach((d) => w.update(d.ref, data));
  await w.close();
}
