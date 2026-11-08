import type { Session } from "@/lib/types";
import { db } from "@/lib/server/firebase";
import { body, handler, ownedDoc } from "@/lib/server/http";
import { resourceInput } from "@/lib/server/inputs";

export const POST = handler(async (req, { id }) => {
  const { item } = await ownedDoc<Session>(req, "sessions", id);
  const ref = await db().collection("resources").add({ c: item.c, session: id, ...resourceInput(await body(req)), createdAt: Date.now() });
  return { id: ref.id };
});
