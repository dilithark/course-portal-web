import { currentUser, handler } from "@/lib/server/http";
import { myCourses, summarize } from "@/lib/server/queries";

export const GET = handler(async (req) => {
  const me = await currentUser(req);
  return summarize(await myCourses(me), me.role === "student");
});
