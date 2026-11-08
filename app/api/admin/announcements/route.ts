import { db } from "@/lib/server/firebase";
import { body, handler, requireRole } from "@/lib/server/http";
import { announcementInput } from "@/lib/server/inputs";

export const POST = handler(async (req) => {
  const me = await requireRole(req, "admin");
  await db().collection("announcements").add({ c: null, ...announcementInput(await body(req)), author: me.id, authorName: me.name, at: Date.now() });
});
