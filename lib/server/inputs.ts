import type { MeetingProvider, ResourceType } from "@/lib/types";
import { db } from "./firebase";
import { HttpError, httpUrl, int, oneOf, str, time } from "./http";

export const MEETING_PROVIDERS = ["zoom", "meet", "other"] as const satisfies readonly MeetingProvider[];
export const RESOURCE_TYPES = ["slides", "document", "video", "link"] as const satisfies readonly ResourceType[];

export function sessionInput(b: Record<string, unknown>) {
  const startsAt = time(b.startsAt, "Start time")!;
  const endsAt = time(b.endsAt, "End time")!;
  if (endsAt <= startsAt) throw new HttpError(400, "The session must end after it starts.");
  const availableFrom = time(b.availableFrom, "Available from", false);
  const m = b.meeting as Record<string, unknown> | null | undefined;
  const meeting = m && m.url ? { provider: oneOf(m.provider, MEETING_PROVIDERS, "Meeting type"), url: httpUrl(m.url, "Meeting link") } : null;
  return { title: str(b.title, 160, "Session title"), desc: str(b.desc, 4000), startsAt, endsAt, availableFrom, meeting };
}

export function resourceInput(b: Record<string, unknown>) {
  return { title: str(b.title, 160, "Resource title"), type: oneOf(b.type, RESOURCE_TYPES, "Resource type"), url: httpUrl(b.url, "Resource link") };
}

export async function assignmentInput(b: Record<string, unknown>, courseId: string) {
  const session = str(b.session, 64) || null;
  if (session) {
    const s = await db().collection("sessions").doc(session).get();
    if (!s.exists || s.get("c") !== courseId) throw new HttpError(400, "That session isn’t part of this course.");
  }
  return {
    title: str(b.title, 160, "Assignment title"),
    desc: str(b.desc, 8000),
    dueAt: time(b.dueAt, "Deadline")!,
    maxMarks: int(b.maxMarks ?? 100, 1, 1000, "Maximum marks"),
    allowLate: b.allowLate === true,
    availableFrom: time(b.availableFrom, "Available from", false),
    session,
  };
}

export function announcementInput(b: Record<string, unknown>) {
  return { title: str(b.title, 160, "Title"), body: str(b.body, 8000, "Message") };
}
