import { db } from "@/lib/server/firebase";
import { currentUser, handler } from "@/lib/server/http";

/** Clears the "choose your own password" prompt after the user changes their password. */
export const POST = handler(async (req) => {
  const me = await currentUser(req);
  await db().collection("users").doc(me.id).update({ mustChangePassword: false });
});
