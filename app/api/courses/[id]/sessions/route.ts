import type { Resource, Session } from "@/lib/types";
import { db, whereEq } from "@/lib/server/firebase";
import { body, courseAccess, handler } from "@/lib/server/http";
import { sessionInput } from "@/lib/server/inputs";
import { isAvailable } from "@/lib/server/queries";

export const GET = handler(async (req, { id }): Promise<Session[]> => {
  const { canManage } = await courseAccess(req, id);
  const [sessions, resources] = await Promise.all([whereEq<Session>("sessions", "c", id), whereEq<Resource>("resources", "c", id)]);
  return sessions
    .filter((s) => canManage || isAvailable(s))
    .sort((a, b) => a.startsAt - b.startsAt)
    .map((s) => ({ ...s, resources: resources.filter((r) => r.session === s.id).sort((a, b) => a.createdAt - b.createdAt) }));
});

export const POST = handler(async (req, { id }) => {
  await courseAccess(req, id, "manage");
  const ref = await db().collection("sessions").add({ c: id, ...sessionInput(await body(req)), createdAt: Date.now() });
  return { id: ref.id };
});
