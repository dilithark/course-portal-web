import type { Resource } from "@/lib/types";
import { body, handler, ownedDoc } from "@/lib/server/http";
import { resourceInput } from "@/lib/server/inputs";

export const PATCH = handler(async (req, { id }) => {
  const { ref } = await ownedDoc<Resource>(req, "resources", id);
  await ref.update(resourceInput(await body(req)));
});

export const DELETE = handler(async (req, { id }) => {
  const { ref } = await ownedDoc<Resource>(req, "resources", id);
  await ref.delete();
});
