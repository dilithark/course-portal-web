"use client";

import { useState } from "react";
import { useCourse } from "@/components/CourseContext";
import { ConfirmButton } from "@/components/ui/Confirm";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Async, Badge, Empty, ErrorText, Ext } from "@/components/ui/bits";
import { api } from "@/lib/api";
import { formObject, useAction, useApi, useNow } from "@/lib/hooks";
import { dateTime, fromInput, relative, timeRange, toInput } from "@/lib/time";
import type { MeetingProvider, Resource, ResourceType, Session } from "@/lib/types";

const RES_ICON: Record<ResourceType, IconName> = { slides: "slides", document: "file", video: "video", link: "link" };
const RES_LABEL: Record<ResourceType, string> = { slides: "Slides", document: "Document", video: "Video", link: "Link" };
const MEET_LABEL: Record<MeetingProvider, string> = { zoom: "Zoom", meet: "Google Meet", other: "Meeting" };

function guessProvider(url: string): MeetingProvider {
  if (/zoom\.us/i.test(url)) return "zoom";
  if (/meet\.google\.com/i.test(url)) return "meet";
  return "other";
}

function status(s: Session, now = Date.now()) {
  if (s.availableFrom && s.availableFrom > now) return { label: `Hidden until ${dateTime(s.availableFrom)}`, tone: "mu" as const };
  if (s.startsAt <= now && s.endsAt >= now) return { label: "Live now", tone: "er" as const };
  if (s.endsAt < now) return { label: "Completed", tone: "ok" as const };
  return { label: relative(s.startsAt), tone: "info" as const };
}

function SessionForm({ session, courseId, onClose, onSaved }: { session?: Session; courseId: string; onClose: () => void; onSaved: () => void }) {
  const { run, pending, error } = useAction();
  const toast = useToast();
  const [provider, setProvider] = useState<MeetingProvider>(session?.meeting?.provider ?? "meet");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const d = formObject(e.currentTarget);
        const payload = {
          title: d.title,
          desc: d.desc,
          startsAt: fromInput(d.startsAt),
          endsAt: fromInput(d.endsAt),
          availableFrom: d.hide === "on" ? fromInput(d.availableFrom) : null,
          meeting: d.meetingUrl ? { provider, url: d.meetingUrl } : null,
        };
        const ok = await run(() => api(session ? `/api/sessions/${session.id}` : `/api/courses/${courseId}/sessions`, session ? "PATCH" : "POST", payload));
        if (ok !== undefined) {
          toast(session ? "Session updated" : "Session added");
          onSaved();
          onClose();
        }
      }}
    >
      <div className="modal-body form-grid">
        <label className="field span-2">
          <span>Title</span>
          <input name="title" defaultValue={session?.title} required maxLength={160} placeholder="e.g. Week 3 — Responsive layouts" />
        </label>
        <label className="field">
          <span>Starts</span>
          <input name="startsAt" type="datetime-local" defaultValue={toInput(session?.startsAt)} required />
        </label>
        <label className="field">
          <span>Ends</span>
          <input name="endsAt" type="datetime-local" defaultValue={toInput(session?.endsAt)} required />
        </label>
        <label className="field span-2">
          <span>Description</span>
          <textarea name="desc" rows={3} defaultValue={session?.desc} maxLength={4000} placeholder="What this session covers" />
        </label>
        <fieldset className="field span-2 fieldset">
          <legend>Meeting link</legend>
          <div className="seg">
            {(["meet", "zoom", "other"] as MeetingProvider[]).map((p) => (
              <button key={p} type="button" className={provider === p ? "on" : ""} onClick={() => setProvider(p)}>
                {MEET_LABEL[p]}
              </button>
            ))}
          </div>
          <input
            name="meetingUrl"
            type="url"
            defaultValue={session?.meeting?.url}
            placeholder={provider === "zoom" ? "https://zoom.us/j/…" : provider === "meet" ? "https://meet.google.com/…" : "https://…"}
            onBlur={(e) => e.target.value && setProvider(guessProvider(e.target.value))}
          />
        </fieldset>
        <fieldset className="field span-2 fieldset">
          <legend>Availability</legend>
          <label className="check">
            <input type="checkbox" name="hide" defaultChecked={!!session?.availableFrom} />
            Hide from students until a set time
          </label>
          <input name="availableFrom" type="datetime-local" defaultValue={toInput(session?.availableFrom)} aria-label="Visible to students from" />
        </fieldset>
        <ErrorText err={error} />
      </div>
      <footer className="modal-foot">
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn" disabled={pending}>{pending ? "Saving…" : session ? "Save session" : "Add session"}</button>
      </footer>
    </form>
  );
}

function ResourceForm({ sessionId, resource, onClose, onSaved }: { sessionId: string; resource?: Resource; onClose: () => void; onSaved: () => void }) {
  const { run, pending, error } = useAction();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const d = formObject(e.currentTarget);
        const ok = await run(() => api(resource ? `/api/resources/${resource.id}` : `/api/sessions/${sessionId}/resources`, resource ? "PATCH" : "POST", d));
        if (ok !== undefined) {
          onSaved();
          onClose();
        }
      }}
    >
      <div className="modal-body form-grid">
        <label className="field span-2">
          <span>Title</span>
          <input name="title" defaultValue={resource?.title} required maxLength={160} placeholder="e.g. Week 3 slides" />
        </label>
        <label className="field">
          <span>Type</span>
          <select name="type" defaultValue={resource?.type ?? "slides"}>
            {(Object.keys(RES_LABEL) as ResourceType[]).map((t) => (
              <option key={t} value={t}>{RES_LABEL[t]}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Link</span>
          <input name="url" type="url" defaultValue={resource?.url} required placeholder="https://docs.google.com/…" />
        </label>
        <ErrorText err={error} />
      </div>
      <footer className="modal-foot">
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn" disabled={pending}>{pending ? "Saving…" : resource ? "Save resource" : "Add resource"}</button>
      </footer>
    </form>
  );
}

type Editing =
  | { kind: "session"; session?: Session }
  | { kind: "resource"; sessionId: string; resource?: Resource }
  | null;

export default function SessionsPage() {
  const { course } = useCourse();
  const q = useApi<Session[]>(`/api/courses/${course.id}/sessions`);
  const [editing, setEditing] = useState<Editing>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");
  const now = useNow();
  const toast = useToast();
  const close = () => setEditing(null);

  return (
    <>
      <div className="section-head">
        <div className="seg">
          {(["all", "upcoming", "past"] as const).map((f) => (
            <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        {course.canManage && (
          <button className="btn" onClick={() => setEditing({ kind: "session" })}>
            <Icon name="plus" /> New session
          </button>
        )}
      </div>
      <Async q={q}>
        {(sessions) => {
          const list = sessions.filter((s) => filter === "all" || (filter === "upcoming" ? s.endsAt >= now : s.endsAt < now));
          if (!list.length)
            return (
              <Empty icon="calendar" title={sessions.length ? "No sessions match" : "No sessions yet"}>
                {course.canManage ? "Add the first session to build out the schedule." : "Your mentor hasn’t published any sessions yet."}
              </Empty>
            );
          return (
            <ol className="timeline">
              {list.map((s, i) => {
                const st = status(s, now);
                return (
                  <li key={s.id} id={s.id} className="session">
                    <div className="session-num">{String(sessions.indexOf(s) + 1 || i + 1).padStart(2, "0")}</div>
                    <article className="panel session-card">
                      <header className="session-head">
                        <div>
                          <h3>{s.title}</h3>
                          <p className="mu small">
                            <Icon name="clock" size={14} /> {timeRange(s.startsAt, s.endsAt)}
                          </p>
                        </div>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </header>
                      {s.desc && <p className="pw">{s.desc}</p>}

                      <div className="meeting-row">
                        {s.meeting ? (
                          <>
                            <span className="meeting-tag">
                              <Icon name="video" size={16} /> {MEET_LABEL[s.meeting.provider]}
                            </span>
                            <Ext href={s.meeting.url} className="btn sm">
                              Join meeting <Icon name="external" size={14} />
                            </Ext>
                          </>
                        ) : (
                          <span className="mu small">No meeting link yet.</span>
                        )}
                      </div>

                      <div className="resources">
                        <h4>Resources</h4>
                        {s.resources?.length ? (
                          <ul>
                            {s.resources.map((r) => (
                              <li key={r.id}>
                                <Ext href={r.url} className="resource">
                                  <Icon name={RES_ICON[r.type]} />
                                  <span>{r.title}</span>
                                  <small>{RES_LABEL[r.type]}</small>
                                </Ext>
                                {course.canManage && (
                                  <span className="row-actions">
                                    <button className="icon-btn" aria-label={`Edit ${r.title}`} onClick={() => setEditing({ kind: "resource", sessionId: s.id, resource: r })}>
                                      <Icon name="edit" size={16} />
                                    </button>
                                    <ConfirmButton
                                      className="icon-btn"
                                      ariaLabel={`Remove ${r.title}`}
                                      title="Remove resource?"
                                      message={`“${r.title}” will be removed from this session.`}
                                      onConfirm={async () => {
                                        await api(`/api/resources/${r.id}`, "DELETE");
                                        await q.reload();
                                      }}
                                    >
                                      <Icon name="trash" size={16} />
                                    </ConfirmButton>
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mu small">No resources yet.</p>
                        )}
                      </div>

                      {course.canManage && (
                        <footer className="session-actions">
                          <button className="btn ghost sm" onClick={() => setEditing({ kind: "resource", sessionId: s.id })}>
                            <Icon name="plus" size={16} /> Add resource
                          </button>
                          <button className="btn ghost sm" onClick={() => setEditing({ kind: "session", session: s })}>
                            <Icon name="edit" size={16} /> Edit session
                          </button>
                          <ConfirmButton
                            title="Delete session?"
                            message={`“${s.title}” and its resources will be deleted. Assignments linked to it are kept.`}
                            onConfirm={async () => {
                              await api(`/api/sessions/${s.id}`, "DELETE");
                              toast("Session deleted");
                              await q.reload();
                            }}
                          >
                            <Icon name="trash" size={16} /> Delete
                          </ConfirmButton>
                        </footer>
                      )}
                    </article>
                  </li>
                );
              })}
            </ol>
          );
        }}
      </Async>
      <Modal open={editing?.kind === "session"} onClose={close} title={editing?.kind === "session" && editing.session ? "Edit session" : "New session"} wide>
        {editing?.kind === "session" && <SessionForm key={editing.session?.id ?? "new"} session={editing.session} courseId={course.id} onClose={close} onSaved={q.reload} />}
      </Modal>
      <Modal open={editing?.kind === "resource"} onClose={close} title={editing?.kind === "resource" && editing.resource ? "Edit resource" : "Add resource"}>
        {editing?.kind === "resource" && <ResourceForm key={editing.resource?.id ?? "new"} sessionId={editing.sessionId} resource={editing.resource} onClose={close} onSaved={q.reload} />}
      </Modal>
    </>
  );
}
