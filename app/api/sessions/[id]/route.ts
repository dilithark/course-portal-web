import type { Session } from "@/lib/types";
import { deleteWhere, updateWhere } from "@/lib/server/firebase";
import { body, handler, ownedDoc } from "@/lib/server/http";
import { sessionInput } from "@/lib/server/inputs";

export const PATCH = handler(async (req, { id }) => {
  const { ref } = await ownedDoc<Session>(req, "sessions", id);
  await ref.update(sessionInput(await body(req)));
});

/** Removes the session and its resources; linked assignments are kept but unlinked. */
export const DELETE = handler(async (req, { id }) => {
  const { ref } = await ownedDoc<Session>(req, "sessions", id);
  await Promise.all([deleteWhere("resources", "session", id), updateWhere("assignments", "session", id, { session: null })]);
  await ref.delete();
});
