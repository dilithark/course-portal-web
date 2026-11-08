import { adminAuth } from "@/lib/server/firebase";
import { currentUser, handler } from "@/lib/server/http";

/** Signs the user out on every device by revoking their refresh tokens. */
export const DELETE = handler(async (req) => {
  const me = await currentUser(req);
  await adminAuth().revokeRefreshTokens(me.id);
});
