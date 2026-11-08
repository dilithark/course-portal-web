"use client";

import { api } from "@/lib/api";
import { formObject, useAction } from "@/lib/hooks";
import { dateTime, relative } from "@/lib/time";
import type { Announcement } from "@/lib/types";
import { ConfirmButton } from "./ui/Confirm";
import { Icon } from "./ui/Icon";
import { useToast } from "./ui/Toast";
import { Avatar, Badge, Empty, ErrorText, Panel } from "./ui/bits";

export function AnnouncementComposer({ endpoint, onPosted, placeholder }: { endpoint: string; onPosted: () => void; placeholder: string }) {
  const { run, pending, error } = useAction();
  const toast = useToast();
  return (
    <Panel title="New announcement" className="composer">
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const ok = await run(() => api(endpoint, "POST", formObject(form)));
          if (ok !== undefined) {
            form.reset();
            toast("Announcement published — members will be notified");
            onPosted();
          }
        }}
      >
        <label className="field span-2">
          <span>Title</span>
          <input name="title" required maxLength={160} placeholder="e.g. Session moved to Friday" />
        </label>
        <label className="field span-2">
          <span>Message</span>
          <textarea name="body" required rows={4} maxLength={8000} placeholder={placeholder} />
        </label>
        <ErrorText err={error} />
        <div className="span-2 form-actions">
          <button className="btn" disabled={pending}>
            <Icon name="megaphone" size={16} /> {pending ? "Publishing…" : "Publish"}
          </button>
        </div>
      </form>
    </Panel>
  );
}

export function AnnouncementFeed({ items, canDelete, onChange, showCourse }: { items: Announcement[]; canDelete: (a: Announcement) => boolean; onChange: () => void; showCourse?: boolean }) {
  if (!items.length) return <Empty icon="megaphone" title="No announcements yet" />;
  return (
    <ul className="feed">
      {items.map((a) => (
        <li key={a.id} className="panel ann">
          <header className="ann-head">
            <Avatar name={a.authorName} size={38} />
            <div className="grow">
              <h3>{a.title}</h3>
              <p className="mu small" title={dateTime(a.at)}>
                {a.authorName} · {relative(a.at)}
                {showCourse && <> · <Badge tone={a.c ? "info" : "br"}>{a.courseName ?? "Academy-wide"}</Badge></>}
              </p>
            </div>
            {canDelete(a) && (
              <ConfirmButton
                className="icon-btn"
                ariaLabel="Delete announcement"
                title="Delete announcement?"
                message={`“${a.title}” will be removed for everyone.`}
                onConfirm={async () => {
                  await api(`/api/announcements/${a.id}`, "DELETE");
                  onChange();
                }}
              >
                <Icon name="trash" size={16} />
              </ConfirmButton>
            )}
          </header>
          <p className="pw">{a.body}</p>
        </li>
      ))}
    </ul>
  );
}
