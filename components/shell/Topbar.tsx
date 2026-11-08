"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { relative } from "@/lib/time";
import { useAuth, useMe } from "../auth/AuthProvider";
import { Icon, type IconName } from "../ui/Icon";
import { Avatar, ContactButton } from "../ui/bits";
import { usePortal } from "./PortalContext";
import type { NotificationKind } from "@/lib/types";

export const KIND_ICON: Record<NotificationKind, IconName> = {
  announcement: "megaphone", site: "globe", assignment: "clipboard", grade: "award", submission: "file", session: "calendar",
};

/** Button + popover that closes on outside click or Esc. `children` gets a close() callback. */
function Dropdown({ trigger, label, children, onOpen }: { trigger: ReactNode; label: string; children: (close: () => void) => ReactNode; onOpen?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div className="dropdown" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        aria-label={label}
        aria-expanded={open}
        onClick={() => {
          if (!open) onOpen?.();
          setOpen(!open);
        }}
      >
        {trigger}
      </button>
      {open && <div className="menu">{children(() => setOpen(false))}</div>}
    </div>
  );
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const me = useMe();
  const { signOut } = useAuth();
  const router = useRouter();
  const { notifications, unread, markAllRead } = usePortal();
  // Snapshot which items were unread when the panel opened, so they stay highlighted while it's open.
  const [highlight, setHighlight] = useState<Set<string>>(new Set());

  return (
    <header className="topbar">
      <button type="button" className="icon-btn menu-btn" onClick={onMenu} aria-label="Open menu">
        <Icon name="menu" />
      </button>
      <div className="topbar-spacer" />
      <ContactButton message={`Hi Richmond Live Academy! I'm ${me.name} and I need help with the course portal.`} />
      <Dropdown
        label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        onOpen={() => {
          setHighlight(new Set(notifications.filter((n) => n.unread).map((n) => n.id)));
          if (unread) markAllRead();
        }}
        trigger={
          <>
            <Icon name="bell" size={20} />
            {!!unread && <em className="dot-badge">{unread > 9 ? "9+" : unread}</em>}
          </>
        }
      >
        {(close) => (
          <>
            <div className="menu-head">
              <strong>Notifications</strong>
              <Link href="/notifications" onClick={close}>
                View all
              </Link>
            </div>
            {notifications.length ? (
              notifications.slice(0, 6).map((n) => (
                <Link key={n.id} href={n.href} className={`notif${highlight.has(n.id) ? " unread" : ""}`} onClick={close}>
                  <Icon name={KIND_ICON[n.kind]} />
                  <span>
                    <b>{n.title}</b>
                    <small>{relative(n.at)}</small>
                  </span>
                </Link>
              ))
            ) : (
              <p className="menu-empty">You’re all caught up.</p>
            )}
          </>
        )}
      </Dropdown>
      <Dropdown label="Account menu" trigger={<Avatar name={me.name} size={34} />}>
        {(close) => (
          <>
            <div className="menu-head user">
              <strong>{me.name}</strong>
              <small>{me.email}</small>
            </div>
            <Link href="/profile" className="menu-item" onClick={close}>
              <Icon name="user" /> Profile & security
            </Link>
            <button
              type="button"
              className="menu-item"
              onClick={async () => {
                await signOut();
                router.replace("/login");
              }}
            >
              <Icon name="logout" /> Sign out
            </button>
          </>
        )}
      </Dropdown>
    </header>
  );
}
