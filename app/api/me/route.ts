import { db } from "@/lib/server/firebase";
import { body, currentUser, handler, HttpError, str } from "@/lib/server/http";

export const GET = handler((req) => currentUser(req));

export const PATCH = handler(async (req) => {
  const me = await currentUser(req);
  const b = await body(req);
  const phone = str(b.phone, 32);
  if (phone && !/^[+\d][\d\s()-]{5,}$/.test(phone)) throw new HttpError(400, "That phone number doesn’t look right.");
  const update = { name: str(b.name, 120, "Name"), phone, bio: str(b.bio, 1000) };
  await db().collection("users").doc(me.id).update(update);
  return { ...me, ...update };
});
