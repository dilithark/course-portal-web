import { db } from "@/lib/server/firebase";
import { currentUser, handler } from "@/lib/server/http";
import { notificationsFor } from "@/lib/server/queries";

export const GET = handler(async (req) => notificationsFor(await currentUser(req)));

/** Marks everything up to now as read. */
export const POST = handler(async (req) => {
  const me = await currentUser(req);
  await db().collection("users").doc(me.id).update({ lastSeenNotificationsAt: Date.now() });
});
