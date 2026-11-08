"use client";

import { AnnouncementComposer, AnnouncementFeed } from "@/components/AnnouncementFeed";
import { useCourse } from "@/components/CourseContext";
import { usePortal } from "@/components/shell/PortalContext";
import { Async } from "@/components/ui/bits";
import { useApi } from "@/lib/hooks";
import type { Announcement } from "@/lib/types";

export default function CourseAnnouncements() {
  const { course } = useCourse();
  const { reloadNotifications } = usePortal();
  const q = useApi<Announcement[]>(`/api/courses/${course.id}/announcements`);
  return (
    <>
      {course.canManage && (
        <AnnouncementComposer
          endpoint={`/api/courses/${course.id}/announcements`}
          placeholder={`Write to everyone in ${course.name}`}
          onPosted={() => {
            q.reload();
            reloadNotifications();
          }}
        />
      )}
      <Async q={q}>{(items) => <AnnouncementFeed items={items} canDelete={() => course.canManage} onChange={q.reload} />}</Async>
    </>
  );
}
