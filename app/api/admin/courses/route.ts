import { db } from "@/lib/server/firebase";
import { body, handler, requireRole } from "@/lib/server/http";
import { courseFields } from "@/lib/server/admin";

export const POST = handler(async (req) => {
  await requireRole(req, "admin");
  const ref = await db().collection("courses").add({ ...courseFields(await body(req)), mentors: [], createdAt: Date.now() });
  return { id: ref.id };
});
