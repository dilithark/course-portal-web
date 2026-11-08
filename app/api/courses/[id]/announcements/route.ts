import { db } from "@/lib/server/firebase";
import { body, courseAccess, handler } from "@/lib/server/http";
import { announcementInput } from "@/lib/server/inputs";
import { announcementsFor } from "@/lib/server/queries";

export const GET = handler(async (req, { id }) => {
  await courseAccess(req, id);
  return announcementsFor([id], false);
});

export const POST = handler(async (req, { id }) => {
  const { me } = await courseAccess(req, id, "manage");
  await db().collection("announcements").add({ c: id, ...announcementInput(await body(req)), author: me.id, authorName: me.name, at: Date.now() });
});
