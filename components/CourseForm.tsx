"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { formObject, useAction } from "@/lib/hooks";
import type { Course } from "@/lib/types";
import { Modal } from "./ui/Modal";
import { ErrorText } from "./ui/bits";

/** Admin: create or edit a course (name, code, description, colour). */
export function CourseForm({ open, onClose, course, onSaved }: { open: boolean; onClose: () => void; course?: Course; onSaved: () => void }) {
  const { run, pending, error } = useAction();
  const [hue, setHue] = useState(course?.hue ?? 350);
  return (
    <Modal open={open} onClose={onClose} title={course ? "Edit course" : "New course"}>
      <form
        key={course?.id ?? "new"}
        onSubmit={async (e) => {
          e.preventDefault();
          const d = formObject(e.currentTarget);
          const ok = await run(() => api(course ? `/api/admin/courses/${course.id}` : "/api/admin/courses", course ? "PATCH" : "POST", { ...d, hue }));
          if (ok !== undefined) {
            onSaved();
            onClose();
          }
        }}
      >
        <div className="modal-body form-grid">
          <label className="field span-2">
            <span>Course name</span>
            <input name="name" defaultValue={course?.name} required maxLength={120} placeholder="e.g. Web Development" />
          </label>
          <label className="field">
            <span>Code</span>
            <input name="code" defaultValue={course?.code} required maxLength={12} placeholder="WEB" />
          </label>
          <label className="field">
            <span>Colour</span>
            <div className="hue-row">
              <input type="range" min={0} max={359} value={hue} onChange={(e) => setHue(+e.target.value)} aria-label="Course colour" />
              <i className="hue-swatch" style={{ background: `hsl(${hue} 70% 50%)` }} />
            </div>
          </label>
          <label className="field span-2">
            <span>Description</span>
            <textarea name="desc" defaultValue={course?.desc} rows={4} maxLength={1000} placeholder="What students will learn" />
          </label>
          <ErrorText err={error} />
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={pending}>{pending ? "Saving…" : course ? "Save changes" : "Create course"}</button>
        </footer>
      </form>
    </Modal>
  );
}
