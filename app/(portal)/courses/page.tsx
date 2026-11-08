"use client";

import { useState } from "react";
import { useMe } from "@/components/auth/AuthProvider";
import { CourseCard } from "@/components/CourseCard";
import { CourseForm } from "@/components/CourseForm";
import { usePortal } from "@/components/shell/PortalContext";
import { Icon } from "@/components/ui/Icon";
import { Empty, Loading, PageHeader } from "@/components/ui/bits";

export default function CoursesPage() {
  const me = useMe();
  const { courses, reloadCourses } = usePortal();
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const list = courses?.filter((c) => (c.name + c.code + c.desc).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader
        title={me.role === "admin" ? "Courses" : "My courses"}
        sub={me.role === "admin" ? "Every course in the academy." : me.role === "mentor" ? "Courses you mentor." : "Courses you’re enrolled in."}
        actions={
          me.role === "admin" && (
            <button className="btn" onClick={() => setCreating(true)}>
              <Icon name="plus" /> New course
            </button>
          )
        }
      />
      {!courses ? (
        <Loading />
      ) : courses.length ? (
        <>
          {courses.length > 4 && (
            <label className="search">
              <Icon name="search" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses" aria-label="Search courses" />
            </label>
          )}
          <div className="course-grid">{list!.map((c) => <CourseCard key={c.id} c={c} />)}</div>
        </>
      ) : (
        <Empty title="No courses yet">
          {me.role === "admin" ? "Create the first course to get started." : me.role === "mentor" ? "An admin will assign you to a course." : "Your admin will add you to your courses."}
        </Empty>
      )}
      {me.role === "admin" && <CourseForm open={creating} onClose={() => setCreating(false)} onSaved={reloadCourses} />}
    </>
  );
}
