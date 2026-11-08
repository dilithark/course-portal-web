"use client";

import { api } from "@/lib/api";
import { formObject, useAction, useApi } from "@/lib/hooks";
import { fromInput, toInput } from "@/lib/time";
import type { Assignment, Session } from "@/lib/types";
import { useToast } from "./ui/Toast";
import { ErrorText } from "./ui/bits";

export function AssignmentForm({ courseId, assignment, onClose, onSaved }: { courseId: string; assignment?: Assignment; onClose: () => void; onSaved: () => void }) {
  const { run, pending, error } = useAction();
  const sessions = useApi<Session[]>(`/api/courses/${courseId}/sessions`);
  const toast = useToast();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const d = formObject(e.currentTarget);
        const payload = {
          title: d.title,
          desc: d.desc,
          dueAt: fromInput(d.dueAt),
          maxMarks: Number(d.maxMarks),
          allowLate: d.allowLate === "on",
          availableFrom: d.hide === "on" ? fromInput(d.availableFrom) : null,
          session: d.session || null,
        };
        const ok = await run(() => api(assignment ? `/api/assignments/${assignment.id}` : `/api/courses/${courseId}/assignments`, assignment ? "PATCH" : "POST", payload));
        if (ok !== undefined) {
          toast(assignment ? "Assignment updated" : "Assignment published");
          onSaved();
          onClose();
        }
      }}
    >
      <div className="modal-body form-grid">
        <label className="field span-2">
          <span>Title</span>
          <input name="title" defaultValue={assignment?.title} required maxLength={160} placeholder="e.g. Build a landing page" />
        </label>
        <label className="field span-2">
          <span>Instructions</span>
          <textarea name="desc" rows={5} defaultValue={assignment?.desc} maxLength={8000} placeholder="What students need to do and how it’s marked" />
        </label>
        <label className="field">
          <span>Deadline</span>
          <input name="dueAt" type="datetime-local" defaultValue={toInput(assignment?.dueAt)} required />
        </label>
        <label className="field">
          <span>Maximum marks</span>
          <input name="maxMarks" type="number" min={1} max={1000} defaultValue={assignment?.maxMarks ?? 100} required />
        </label>
        <label className="field span-2">
          <span>Linked session (optional)</span>
          <select name="session" defaultValue={assignment?.session ?? ""}>
            <option value="">Not linked</option>
            {sessions.data?.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </label>
        <label className="check span-2">
          <input type="checkbox" name="allowLate" defaultChecked={assignment?.allowLate} />
          Accept late submissions (marked as late)
        </label>
        <fieldset className="field span-2 fieldset">
          <legend>Availability</legend>
          <label className="check">
            <input type="checkbox" name="hide" defaultChecked={!!assignment?.availableFrom} />
            Hide from students until a set time
          </label>
          <input name="availableFrom" type="datetime-local" defaultValue={toInput(assignment?.availableFrom)} aria-label="Visible to students from" />
        </fieldset>
        <ErrorText err={error} />
      </div>
      <footer className="modal-foot">
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn" disabled={pending}>{pending ? "Saving…" : assignment ? "Save changes" : "Publish assignment"}</button>
      </footer>
    </form>
  );
}
