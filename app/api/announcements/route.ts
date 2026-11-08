import { currentUser, handler } from "@/lib/server/http";
import { announcementsFor, myCourses } from "@/lib/server/queries";

/** Site-wide announcements plus those from the user's courses. */
export const GET = handler(async (req) => {
  const me = await currentUser(req);
  const ids = (await myCourses(me)).map((c) => c.id);
  return announcementsFor(ids);
});
