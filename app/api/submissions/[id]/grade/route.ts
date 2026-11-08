import type { Assignment, Submission } from "@/lib/types";
import { db } from "@/lib/server/firebase";
import { body, handler, HttpError, int, ownedDoc, str } from "@/lib/server/http";

export const PUT = handler(async (req, { id }) => {
  const { ref, item, me } = await ownedDoc<Submission>(req, "submissions", id);
  const a = (await db().collection("assignments").doc(item.g).get()).data() as Assignment | undefined;
  if (!a) throw new HttpError(404, "That assignment no longer exists.");
  const b = await body(req);
  await ref.update({ marks: int(b.marks, 0, a.maxMarks, "Marks"), feedback: str(b.feedback, 4000), gradedAt: Date.now(), gradedBy: me.id });
});

export const DELETE = handler(async (req, { id }) => {
  const { ref } = await ownedDoc<Submission>(req, "submissions", id);
  await ref.update({ marks: null, feedback: "", gradedAt: null });
});
