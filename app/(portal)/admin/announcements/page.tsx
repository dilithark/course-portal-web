"use client";

import { AnnouncementComposer, AnnouncementFeed } from "@/components/AnnouncementFeed";
import { RequireRole } from "@/components/auth/RequireRole";
import { Async, PageHeader } from "@/components/ui/bits";
import { useApi } from "@/lib/hooks";
import type { Announcement } from "@/lib/types";

function SiteAnnouncements() {
  const q = useApi<Announcement[]>("/api/announcements");
  return (
    <>
      <PageHeader title="Site announcements" sub="Messages here reach every student and mentor in the academy." />
      <AnnouncementComposer endpoint="/api/admin/announcements" placeholder="Write to everyone at Richmond Live Academy" onPosted={q.reload} />
      <Async q={q}>{(items) => <AnnouncementFeed items={items.filter((a) => !a.c)} canDelete={() => true} onChange={q.reload} />}</Async>
    </>
  );
}

export default function Page() {
  return (
    <RequireRole roles={["admin"]}>
      <SiteAnnouncements />
    </RequireRole>
  );
}
