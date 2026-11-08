"use client";

import { useState } from "react";
import { AnnouncementFeed } from "@/components/AnnouncementFeed";
import { useMe } from "@/components/auth/AuthProvider";
import { Async, PageHeader } from "@/components/ui/bits";
import { useApi } from "@/lib/hooks";
import type { Announcement } from "@/lib/types";

export default function AnnouncementsPage() {
  const me = useMe();
  const q = useApi<Announcement[]>("/api/announcements");
  const [scope, setScope] = useState("all");
  return (
    <>
      <PageHeader title="Announcements" sub="Academy-wide news and updates from your courses." />
      <Async q={q}>
        {(items) => {
          const courses = [...new Map(items.filter((a) => a.c).map((a) => [a.c!, a.courseName ?? "Course"])).entries()];
          const list = items.filter((a) => scope === "all" || (scope === "site" ? !a.c : a.c === scope));
          return (
            <>
              <div className="seg">
                <button className={scope === "all" ? "on" : ""} onClick={() => setScope("all")}>All</button>
                <button className={scope === "site" ? "on" : ""} onClick={() => setScope("site")}>Academy-wide</button>
                {courses.map(([id, name]) => (
                  <button key={id} className={scope === id ? "on" : ""} onClick={() => setScope(id)}>{name}</button>
                ))}
              </div>
              <AnnouncementFeed items={list} showCourse canDelete={(a) => me.role === "admin" && !a.c} onChange={q.reload} />
            </>
          );
        }}
      </Async>
    </>
  );
}
