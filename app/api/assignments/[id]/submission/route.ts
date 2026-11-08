import type { Assignment } from "@/lib/types";
import { db } from "@/lib/server/firebase";
import { body, handler, HttpError, httpUrl, ownedDoc, str } from "@/lib/server/http";
import { isAvailable } from "@/lib/server/queries";

/** Students submit (or replace) a link to their work, e.g. a Google Drive share link. */
export const PUT = handler(async (req, { id }) => {
  const { item, me } = await ownedDoc<Assignment>(req, "assignments", id, "view");
  if (me.role !== "student") throw new HttpError(403, "Only students submit assignments.");
  const now = Date.now();
  if (!isAvailable(item, now)) throw new HttpError(400, "This assignment isn’t open yet.");
  if (now > item.dueAt && !item.allowLate) throw new HttpError(400, "The deadline has passed and late submissions are closed.");
  const ref = db().collection("submissions").doc(`${id}_${me.id}`);
  const existing = await ref.get();
  if (existing.exists && existing.get("marks") != null) throw new HttpError(400, "This submission is already graded. Ask your mentor if you need to resubmit.");
  const b = await body(req);
  await ref.set({
    g: id, s: me.id, c: item.c,
    link: httpUrl(b.link, "Submission link"), note: str(b.note, 2000),
    submittedAt: now, late: now > item.dueAt, marks: null, feedback: "", gradedAt: null,
  });
});

export const DELETE = handler(async (req, { id }) => {
  const { item, me } = await ownedDoc<Assignment>(req, "assignments", id, "view");
  if (me.role !== "student") throw new HttpError(403, "Only students can withdraw submissions.");
  if (Date.now() > item.dueAt) throw new HttpError(400, "You can’t withdraw after the deadline.");
  const ref = db().collection("submissions").doc(`${id}_${me.id}`);
  const s = await ref.get();
  if (s.exists && s.get("marks") != null) throw new HttpError(400, "Graded submissions can’t be withdrawn.");
  await ref.delete();
});
